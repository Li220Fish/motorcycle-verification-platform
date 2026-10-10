<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getVerificationById,
  listAllVehicles,
  listUserProfiles,
  listVerificationAnswers,
  listVerificationEvidence,
  type AdminUserProfile,
  type AdminVerificationDetail,
} from '../services/admin-data.service'
import { findItemById, getFlowSections } from '@/data/verification'
import { aiVisionItemsForAprItem, aiVisionItemTitle } from '@/data/verification/ai-vision-items'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_SESSION_ITEM_IDS,
  ENGINE_SESSION_PHASES,
  ENGINE_STARTUP_ITEM_IDS,
  HOT_ENGINE_SESSION_ITEM_IDS,
} from '@/data/verification/engine-session'
import { getPhotoSlotByItemId, getRetiredPhotoSlotLabel } from '@/data/verification/photo-slots'
import { storageService } from '@/services/firebase/storage.service'
import { computeVerificationScore, scorableAnswers } from '@/services/verification/scoring.service'
import type { Vehicle } from '@/types/vehicle'
import type { VerificationAnswer, VerificationEvidence } from '@/types/verification-evidence'
import ImuStabilityChart from '../components/ImuStabilityChart.vue'

const props = defineProps<{ id?: string }>()
const router = useRouter()

const loading = ref(true)
const verification = ref<AdminVerificationDetail | null>(null)
const vehicle = ref<Vehicle | null>(null)
const submitter = ref<AdminUserProfile | null>(null)
const answers = ref<VerificationAnswer[]>([])
// Resolved, storage.rules-checked download URLs keyed by evidence id — never
// cached past this page load, same reasoning as the mobile report's
// identical pattern (VerificationReportView.vue's resolvedPhotoUrls).
const evidenceByItem = ref<Record<string, VerificationEvidence[]>>({})
const evidenceUrls = ref<Record<string, string>>({})

function evidenceFor(itemId: string): VerificationEvidence[] {
  return evidenceByItem.value[itemId] ?? []
}

/** Engine Audio v3's full backend JSON (spec §23/§26) lives on the shared
 * 23s audio Evidence doc's own `metadata.engineAudioV3` (see
 * engine-sensor-session.service.ts's markEngineAudioAnalysisOnEvidence) —
 * that evidence is filed under ENG-03, same file ENG-03..06 all share.
 * Loosely typed (`unknown` sub-shapes rendered as-is via JSON.stringify
 * below) since this is a debug/traceability view, not something the admin
 * UI needs to deeply interact with field-by-field. */
interface EngineAudioAnalysisSummary {
  recordingAssessment?: {
    usable?: boolean
    audioQuality?: string
    silenceRatio?: number
    clippingRatio?: number
  }
  phaseAssessment?: Record<string, { valid?: boolean; stallDetected?: boolean }>
  detectedEvents?: { type: string; timeMs: number; endTimeMs?: number; confidence: number }[]
  dspSummary?: unknown
  engineTypeNote?: string
  engineTypeConfidence?: number
  pipelineVersions?: Record<string, string>
}

function engineAudioAnalysisFromEvidence(): EngineAudioAnalysisSummary | undefined {
  const audioEvidence = evidenceFor(ENGINE_STARTUP_ITEM_IDS[0]).find((e) => e.type === 'audio')
  return audioEvidence?.metadata?.engineAudioV3 as EngineAudioAnalysisSummary | undefined
}

/** The 23s engine-session audio file is one blob shared across ENG-03..06
 * (see engine-sensor-session.service.ts's own comment on this) — this item's
 * OWN phase window inside that file, so the admin evidence tile can actually
 * play back just the seconds Gemini was asked to judge for THIS item instead
 * of the entire clip. `null` for anything that isn't one of the 4 audio
 * items. */
function audioPhaseBoundsSec(itemId: string): { startSec: number; endSec: number } | null {
  if ((ENGINE_STARTUP_ITEM_IDS as readonly string[]).includes(itemId)) {
    return {
      startSec: ENGINE_SESSION_PHASES.startup.startMs / 1000,
      endSec: ENGINE_SESSION_PHASES.startup.endMs / 1000,
    }
  }
  if (itemId === ENGINE_IDLE_ITEM_IDS[0]) {
    return {
      startSec: ENGINE_SESSION_PHASES.idle.startMs / 1000,
      endSec: ENGINE_SESSION_PHASES.idle.endMs / 1000,
    }
  }
  if (itemId === ENGINE_REV_ITEM_IDS[0]) {
    return {
      startSec: ENGINE_SESSION_PHASES.rev.startMs / 1000,
      endSec: ENGINE_SESSION_PHASES.rev.endMs / 1000,
    }
  }
  return null
}

/** Media Fragments (`#t=start,end`) gets the initial seek right in every
 * browser, but not every engine reliably stops playback exactly at `end` on
 * its own — this keeps it honest for the whole play session instead of
 * quietly playing into the next item's phase. */
function clampAudioPlayback(event: Event, bounds: { startSec: number; endSec: number }): void {
  const audio = event.target as HTMLAudioElement
  if (audio.currentTime < bounds.startSec || audio.currentTime >= bounds.endSec) {
    audio.currentTime = bounds.startSec
    if (event.type === 'timeupdate') audio.pause()
  }
}

/** Which Verification.analysisStatus route key (see
 * analysis-status.service.ts) is responsible for this item's AI verdict —
 * `null` for anything never meant to have one (Optional self-disclosure
 * items, plain manual checks), which must never show a false "API failed"
 * badge just because some unrelated route happens to be in a failed state.
 * 2026-09: the single 'coreVision' route was split into 4 (one per photo
 * group — see core-vision-split.service.ts), so both the raw APR-* photo
 * item ids and the AI-vision sub-item ids they produce need per-group
 * mapping now instead of one shared 'coreVision' bucket. `APR-modifications`
 * (an Optional item that also happens to carry `aiCheck: 'appearance'` for
 * historical reasons) is deliberately absent from both maps below — it was
 * never actually sent to any Core Vision route. */
type AnalysisRouteKey =
  | 'coreVisionSides'
  | 'coreVisionRear'
  | 'coreVisionFrontSuspension'
  | 'coreVisionEngineBottom'
  | 'dashboardOcr'
  | 'coldCheck'
  | 'engineSensorSession'
  | 'hotEngineSensorSession'

const CORE_VISION_ROUTE_BY_SLOT_ID: Record<string, AnalysisRouteKey> = {
  'left-side': 'coreVisionSides',
  'right-side': 'coreVisionSides',
  rear: 'coreVisionRear',
  'front-suspension': 'coreVisionFrontSuspension',
  'engine-bottom': 'coreVisionEngineBottom',
  'transmission-chain': 'coreVisionEngineBottom',
}

const CORE_VISION_ROUTE_BY_AI_ITEM_ID: Record<string, AnalysisRouteKey> = {
  body_damage: 'coreVisionSides',
  paint_condition: 'coreVisionSides',
  body_damage_rear: 'coreVisionRear',
  paint_condition_rear: 'coreVisionRear',
  body_alignment_visual: 'coreVisionRear',
  front_suspension_condition: 'coreVisionFrontSuspension',
  engine_bottom_leak_condition: 'coreVisionEngineBottom',
  engine_bottom_external_condition: 'coreVisionEngineBottom',
  chain_sprocket_condition: 'coreVisionEngineBottom',
}

function analysisRouteKeyFor(itemId: string): AnalysisRouteKey | null {
  if (itemId === 'ENG-02') return 'coldCheck'
  if (ENGINE_SESSION_ITEM_IDS.includes(itemId)) return 'engineSensorSession'
  if (HOT_ENGINE_SESSION_ITEM_IDS.includes(itemId)) return 'hotEngineSensorSession'
  if (CORE_VISION_ROUTE_BY_AI_ITEM_ID[itemId]) return CORE_VISION_ROUTE_BY_AI_ITEM_ID[itemId]
  const slot = getPhotoSlotByItemId(itemId)
  if (slot && CORE_VISION_ROUTE_BY_SLOT_ID[slot.id]) return CORE_VISION_ROUTE_BY_SLOT_ID[slot.id]
  if (slot?.aiCheck === 'odometer') return 'dashboardOcr'
  return null
}

/** True only when this item was SUPPOSED to get a real AI verdict, still
 * doesn't have one, and the route it depends on is currently sitting in
 * 'failed' — never for 'processing' (still working) or no route at all
 * (Optional/manual items, which never call any AI route to begin with). */
function apiFailed(answer: VerificationAnswer): boolean {
  const routeKey = analysisRouteKeyFor(answer.itemId)
  if (!routeKey || answer.aiResult) return false
  return verification.value?.analysisStatus?.[routeKey]?.status === 'failed'
}

function apiFailureReason(answer: VerificationAnswer): string | undefined {
  const routeKey = analysisRouteKeyFor(answer.itemId)
  return routeKey ? verification.value?.analysisStatus?.[routeKey]?.error : undefined
}

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  in_progress: '進行中',
  completed: '已完成',
  needs_review: '待複核',
  expired: '已過期',
}
const TYPE_LABEL: Record<string, string> = {
  seller: '車輛驗證',
  buyer: '買家複驗',
  professional: '專業檢驗',
}
const RESULT_LABEL: Record<string, string> = {
  normal: '正常',
  attention: '需要注意',
  unsure: '不確定',
  not_applicable: '不適用',
}
const RESULT_TONE: Record<string, 'ok' | 'attn' | 'mute'> = {
  normal: 'ok',
  attention: 'attn',
  unsure: 'mute',
  not_applicable: 'mute',
}
const RESULT_SEVERITY: Record<string, number> = {
  attention: 3,
  unsure: 2,
  normal: 1,
  not_applicable: 0,
}

/**
 * Mirrors VerificationReportView.vue's effectiveItemResult(): a checklist
 * item's (APR-* etc.) own answer.result is just a capture-time placeholder
 * (see AnswerGroup's doc comment below) — it's never overwritten with a real
 * verdict, because AI analysis writes to the separate Group A/B/C item ids
 * nested in `aiSubAnswers` instead. Without this, the top-level pill always
 * shows the placeholder (不確定) even when its AI sub-items came back 正常,
 * exactly what this looks like when captured live. Only the pill uses this
 * — the raw placeholder answer (itemId/note/its own aiResult, if any) still
 * renders as-is everywhere else on the card, since traceability is the
 * whole point of this screen. */
function effectiveResult(group: AnswerGroup): string {
  const aiResults = group.aiSubAnswers.filter((a) => !!a.aiResult)
  if (aiResults.length === 0) return group.answer.result
  return aiResults.reduce((worst, candidate) =>
    (RESULT_SEVERITY[candidate.result] ?? 0) > (RESULT_SEVERITY[worst.result] ?? 0)
      ? candidate
      : worst,
  ).result
}

function formatDate(ms?: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-TW')
}

/** Checklist items (APR-xxx, ENG-xxx, ...) resolve via the flow definition;
 * Group A/B/C AI-vision items (rear_brake_condition etc.) have no checklist
 * itemId at all — they resolve via their own shared title map instead (see
 * ai-vision-items.ts). The raw id still shows separately (`.answer-id` span
 * below) so admin can always see exactly which AI category produced this
 * verdict, even once the title is human-readable. */
function itemTitle(itemId: string): string {
  const kind = verification.value?.type === 'buyer' ? 'buyer' : 'seller'
  return (
    findItemById(kind, itemId)?.title ??
    aiVisionItemTitle(itemId) ??
    getRetiredPhotoSlotLabel(itemId) ??
    itemId
  )
}

function isChecklistItem(itemId: string): boolean {
  const kind = verification.value?.type === 'buyer' ? 'buyer' : 'seller'
  return !!findItemById(kind, itemId)
}

/**
 * Mirrors the mobile report's merge (VerificationReportView.vue's
 * effectiveItemResult): Group A/B/C AI-vision answers (rear_brake_condition
 * etc.) have no checklist itemId of their own, so they must never render as
 * their own top-level card here either — only nested under the real APR-*
 * checklist item(s) whose photo they analyzed. Unlike the mobile report,
 * admin keeps every AI sub-item's own id/verdict/full JSON visible
 * separately (no worst-of collapsing) since traceability is the whole point
 * of this screen.
 */
interface AnswerGroup {
  answer: VerificationAnswer
  aiSubAnswers: VerificationAnswer[]
  /** True when no Answer doc exists at all for this item (a skipped Optional
   *  item, most commonly) — `answer` is synthesized here purely for display
   *  (never written to Firestore) so it still shows as 不確定 instead of
   *  silently vanishing from its section, or — if every item in a section
   *  was skipped — the whole section disappearing outright. Found live via a
   *  real admin report: "為什麼主動揭露完全不見了". */
  unanswered: boolean
}

interface AnswerSection {
  id: string
  title: string
  groups: AnswerGroup[]
  /** Engine Audio v3's full backend JSON (quality/phase validity/detected
   *  events/DSP summary/engine type/pipeline versions) — lives on the
   *  shared 23s audio Evidence doc's `metadata.engineAudioV3`, not on any
   *  one ENG-03..08 answer, so it's surfaced once on the section that holds
   *  those items rather than repeated on every one of their answer-cards. */
  engineAudioAnalysis?: EngineAudioAnalysisSummary
}

/**
 * Grouped AND ordered by the same section/item order the seller/buyer flow
 * itself uses (`getFlowSections` — the exact data VerificationStepsView.vue
 * and InspectionReportBody.vue build their own screens from), instead of a
 * flat list sorted alphabetically by itemId. Admin previously had no way to
 * tell which checklist phase (核心照片／燈光電系／冷車＋引擎檢查／其他主動揭露)
 * an item actually belonged to short of memorizing every id prefix — this
 * makes the admin detail view read in the same order a seller/buyer actually
 * experienced it.
 */
const answerSections = computed<AnswerSection[]>(() => {
  if (!verification.value) return []
  const flowKind = verification.value.type === 'buyer' ? 'buyer' : 'seller'
  const byId = new Map(answers.value.map((a) => [a.itemId, a]))
  const consumedAiIds = new Set<string>()

  const sections = getFlowSections(flowKind).map((section) => {
    const groups = section.items.map((item) => {
      const existing = byId.get(item.id)
      // Optional items (主動揭露 etc.) never get an Answer doc at all when
      // the user skips them — synthesized here purely for display so the
      // item still shows as 不確定 instead of silently vanishing, same
      // reasoning as defaulting the capture-time placeholder to 'unsure'
      // rather than 'normal' elsewhere in this pass.
      const answer: VerificationAnswer = existing ?? {
        itemId: item.id,
        result: 'unsure',
        updatedAt: 0,
      }
      const aiSubAnswers = aiVisionItemsForAprItem(item.id)
        .map((meta) => byId.get(meta.id))
        .filter((a): a is VerificationAnswer => !!a)
      for (const a of aiSubAnswers) consumedAiIds.add(a.itemId)
      return { answer, aiSubAnswers, unanswered: !existing }
    })
    const engineAudioAnalysis = groups.some((g) =>
      ENGINE_SESSION_ITEM_IDS.includes(g.answer.itemId),
    )
      ? engineAudioAnalysisFromEvidence()
      : undefined
    return { id: section.id, title: section.title, groups, engineAudioAnalysis }
  })

  // Any answer whose item id isn't part of the CURRENT flow — an AI-vision
  // sub-answer whose APR-* item hasn't been answered yet (or whose mapping
  // is somehow missing), or a plain manual answer under an item id since
  // removed from the registry entirely (e.g. 後避震/前煞車/坐墊外觀 etc.,
  // superseded by 基本12項健檢 — see photo-slots.ts's RETIRED_PHOTO_SLOTS) —
  // still needs to be visible somewhere, not silently dropped. Collected
  // into a trailing catch-all section instead of one belonging to no real
  // checklist phase; itemTitle() above already resolves a real Chinese
  // label for the retired-slot case instead of showing the raw itemId.
  const orphanAnswers = answers.value.filter(
    (a) => !isChecklistItem(a.itemId) && !consumedAiIds.has(a.itemId),
  )
  if (orphanAnswers.length > 0) {
    sections.push({
      id: 'orphan-answers',
      title: '其他找不到對應檢測項目（AI 判定或已停用的舊版項目）',
      groups: orphanAnswers.map((answer) => ({ answer, aiSubAnswers: [], unanswered: false })),
      engineAudioAnalysis: undefined,
    })
  }

  return sections
})

const expandedSectionId = ref<string | null>(null)
function toggleSection(sectionId: string): void {
  expandedSectionId.value = expandedSectionId.value === sectionId ? null : sectionId
}
const aiAnsweredCount = computed(() => answers.value.filter((a) => a.aiResult).length)

// 車況評分不再顯示給使用者看（見 VerificationReportView.vue / InspectionReportBody.vue
// 的移除紀錄）——這裡是唯一還會顯示這個分數的地方，僅供後台人員參考，不對外顯示。
const score = computed<number | null>(() => {
  if (!verification.value) return null
  const flowKind = verification.value.type === 'buyer' ? 'buyer' : 'seller'
  const answersById = Object.fromEntries(answers.value.map((a) => [a.itemId, a]))
  return computeVerificationScore(scorableAnswers(answersById, flowKind))
})

onMounted(async () => {
  if (!props.id) {
    loading.value = false
    return
  }
  const ver = await getVerificationById(props.id)
  verification.value = ver
  if (ver) {
    const [vehicles, users, ans, evidence] = await Promise.all([
      listAllVehicles(),
      listUserProfiles(),
      listVerificationAnswers(props.id),
      listVerificationEvidence(props.id),
    ])
    vehicle.value = vehicles.find((v) => v.id === ver.vehicleId) ?? null
    submitter.value = users.find((u) => u.uid === ver.userId) ?? null
    answers.value = ans

    const byItem: Record<string, VerificationEvidence[]> = {}
    for (const item of evidence) (byItem[item.itemId] ??= []).push(item)
    evidenceByItem.value = byItem

    const urlEntries = await Promise.all(
      evidence
        .filter((item) => !!item.remoteUrl)
        .map(async (item) => {
          try {
            return [item.id, await storageService.resolveDownloadUrl(item.remoteUrl!)] as const
          } catch {
            return null
          }
        }),
    )
    evidenceUrls.value = Object.fromEntries(
      urlEntries.filter((entry): entry is readonly [string, string] => !!entry),
    )
  }
  loading.value = false
})
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel-head">
      <h2>檢驗詳情</h2>
      <div class="spacer"></div>
      <button class="admin-btn sm" @click="router.push('/admin/verify')">返回檢驗任務</button>
    </div>

    <p v-if="loading" class="admin-page-intro" style="padding: 17px">載入中...</p>
    <p v-else-if="!verification" class="admin-page-intro" style="padding: 17px">
      找不到這筆驗證紀錄。
    </p>

    <div v-else class="admin-udetail">
      <div class="admin-uside">
        <div class="admin-uname">
          {{ vehicle ? `${vehicle.brand} ${vehicle.model}` : '（找不到車輛）' }}
        </div>
        <div class="admin-ucode">
          {{ submitter?.displayName || submitter?.email || verification.userId.slice(0, 8) }}
        </div>

        <dl class="admin-ufacts">
          <div>
            <dt>驗證 ID</dt>
            <dd class="mono">{{ verification.id.slice(0, 12) }}…</dd>
          </div>
          <div>
            <dt>類型</dt>
            <dd>{{ TYPE_LABEL[verification.type] ?? verification.type }}</dd>
          </div>
          <div>
            <dt>狀態</dt>
            <dd>
              <span
                class="admin-pill"
                :class="
                  verification.status === 'completed'
                    ? 'ok'
                    : verification.status === 'needs_review'
                      ? 'attn'
                      : 'mute'
                "
                >{{ STATUS_LABEL[verification.status] ?? verification.status }}</span
              >
            </dd>
          </div>
          <div>
            <dt>建立時間</dt>
            <dd>{{ formatDate(verification.createdAt) }}</dd>
          </div>
          <div>
            <dt>完成時間</dt>
            <dd>{{ formatDate(verification.completedAt) }}</dd>
          </div>
          <div>
            <dt>公開報告</dt>
            <dd>{{ verification.isPublic ? '是' : '否' }}</dd>
          </div>
          <div>
            <dt>項目總數 / 有 AI 回應</dt>
            <dd>{{ answers.length }} / {{ aiAnsweredCount }}</dd>
          </div>
          <div>
            <dt>檢驗評分</dt>
            <dd>{{ score !== null ? `${score} / 100` : '尚無足夠資料計算' }}</dd>
          </div>
        </dl>
      </div>

      <div class="admin-umain">
        <div v-if="verification.environmentContext" class="admin-usec">
          <h3>驗車環境檢測 <span class="admin-ref app">PREP-03 · environmentContext</span></h3>
          <dl class="admin-kv">
            <div>
              <dt>整體適合度</dt>
              <dd>
                <span
                  class="admin-pill"
                  :class="
                    (verification.environmentContext as any).quality?.overallSuitable
                      ? 'ok'
                      : 'attn'
                  "
                >
                  {{
                    (verification.environmentContext as any).quality?.overallSuitable
                      ? '適合'
                      : '不適合'
                  }}
                </span>
              </dd>
            </div>
            <div>
              <dt>模型</dt>
              <dd class="mono">{{ (verification.environmentContext as any).model }}</dd>
            </div>
            <div v-if="((verification.environmentContext as any).warnings ?? []).length > 0">
              <dt>警示</dt>
              <dd>
                {{ ((verification.environmentContext as any).warnings as string[]).join('、') }}
              </dd>
            </div>
          </dl>
          <pre class="admin-json">{{
            JSON.stringify(verification.environmentContext, null, 2)
          }}</pre>
        </div>

        <div class="admin-usec">
          <h3>各項目結果與 AI 回應 <span class="admin-ref app">collection: answers</span></h3>
          <p class="admin-page-intro" style="padding: 0 0 8px; font-size: 12px">
            後煞車狀況、後避震狀況等 AI 影像判定項目已併入其對應的 APR 檢測項目下方，不再單獨列出。
          </p>
          <div v-if="answerSections.length === 0" class="admin-slot">尚無任何項目回答</div>
          <div v-else class="answer-section-list">
            <div v-for="section in answerSections" :key="section.id" class="answer-section-card">
              <button class="answer-section-header" @click="toggleSection(section.id)">
                <span class="answer-section-title">{{ section.title }}</span>
                <span class="admin-pill mute">{{ section.groups.length }} 項</span>
                <svg
                  class="answer-section-chevron"
                  :class="{ open: expandedSectionId === section.id }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <Transition name="expand">
                <div v-if="expandedSectionId === section.id" class="answer-list">
                  <div v-if="section.engineAudioAnalysis" class="engine-audio-analysis">
                    <p v-if="section.engineAudioAnalysis.engineTypeNote" class="engine-type-note">
                      <strong
                        >引擎類型（AI 判讀，信心
                        {{
                          section.engineAudioAnalysis.engineTypeConfidence?.toFixed(2) ?? 'n/a'
                        }}）：</strong
                      >{{ section.engineAudioAnalysis.engineTypeNote }}
                    </p>
                    <p class="engine-audio-summary-line">
                      音質：{{
                        section.engineAudioAnalysis.recordingAssessment?.audioQuality ?? '—'
                      }}
                      （靜音比
                      {{
                        section.engineAudioAnalysis.recordingAssessment?.silenceRatio?.toFixed(2) ??
                        '—'
                      }}、削頂比
                      {{
                        section.engineAudioAnalysis.recordingAssessment?.clippingRatio?.toFixed(
                          2,
                        ) ?? '—'
                      }}）
                    </p>
                    <p class="engine-audio-summary-line">
                      Phase 有效性：
                      <span
                        v-for="(phase, phaseName) in section.engineAudioAnalysis.phaseAssessment"
                        :key="phaseName"
                        :class="{ 'phase-invalid': phase.valid === false }"
                      >
                        {{ phaseName }}={{ phase.valid ? '✓' : '✗'
                        }}{{ phase.stallDetected ? '（熄火）' : '' }}
                      </span>
                    </p>
                    <p
                      v-if="(section.engineAudioAnalysis.detectedEvents?.length ?? 0) > 0"
                      class="engine-audio-summary-line"
                    >
                      偵測事件：
                      <span
                        v-for="(event, i) in section.engineAudioAnalysis.detectedEvents"
                        :key="i"
                      >
                        {{ event.type }}@{{ (event.timeMs / 1000).toFixed(1) }}s（信心
                        {{ event.confidence.toFixed(2) }}）{{
                          i < (section.engineAudioAnalysis.detectedEvents?.length ?? 0) - 1
                            ? '、'
                            : ''
                        }}
                      </span>
                    </p>
                    <details class="engine-audio-raw">
                      <summary>完整 JSON（Debug／研究用）</summary>
                      <pre>{{ JSON.stringify(section.engineAudioAnalysis, null, 2) }}</pre>
                    </details>
                  </div>
                  <div
                    v-for="group in section.groups"
                    :key="group.answer.itemId"
                    class="answer-card"
                  >
                    <div class="answer-head">
                      <span class="mono answer-id">{{ group.answer.itemId }}</span>
                      <span class="answer-title">{{ itemTitle(group.answer.itemId) }}</span>
                      <span
                        v-if="apiFailed(group.answer)"
                        class="admin-fail-badge"
                        :title="apiFailureReason(group.answer) ?? 'AI 分析失敗'"
                        >!</span
                      >
                      <span
                        v-else
                        class="admin-pill"
                        :class="RESULT_TONE[effectiveResult(group)] ?? 'mute'"
                      >
                        {{ RESULT_LABEL[effectiveResult(group)] ?? effectiveResult(group) }}
                      </span>
                      <span v-if="group.unanswered" class="admin-unanswered-badge">未填寫</span>
                    </div>
                    <p v-if="group.answer.note" class="answer-note">
                      使用者備註：{{ group.answer.note }}
                    </p>
                    <p
                      v-if="apiFailed(group.answer) && apiFailureReason(group.answer)"
                      class="answer-fail-reason"
                    >
                      API 失敗原因：{{ apiFailureReason(group.answer) }}
                    </p>

                    <div v-if="evidenceFor(group.answer.itemId).length > 0" class="evidence-strip">
                      <div
                        v-for="item in evidenceFor(group.answer.itemId)"
                        :key="item.id"
                        class="evidence-tile"
                        :class="{
                          'evidence-tile-wide': item.type === 'audio' || item.type === 'imu',
                        }"
                      >
                        <video
                          v-if="item.type === 'video' && evidenceUrls[item.id]"
                          :src="evidenceUrls[item.id]"
                          controls
                          playsinline
                          class="evidence-media"
                        />
                        <img
                          v-else-if="item.type === 'photo' && evidenceUrls[item.id]"
                          :src="evidenceUrls[item.id]"
                          alt=""
                          class="evidence-media"
                        />
                        <audio
                          v-else-if="
                            item.type === 'audio' &&
                            evidenceUrls[item.id] &&
                            audioPhaseBoundsSec(group.answer.itemId)
                          "
                          :src="`${evidenceUrls[item.id]}#t=${audioPhaseBoundsSec(group.answer.itemId)!.startSec},${audioPhaseBoundsSec(group.answer.itemId)!.endSec}`"
                          controls
                          class="evidence-audio"
                          @loadedmetadata="
                            clampAudioPlayback($event, audioPhaseBoundsSec(group.answer.itemId)!)
                          "
                          @play="
                            clampAudioPlayback($event, audioPhaseBoundsSec(group.answer.itemId)!)
                          "
                          @timeupdate="
                            clampAudioPlayback($event, audioPhaseBoundsSec(group.answer.itemId)!)
                          "
                        />
                        <audio
                          v-else-if="item.type === 'audio' && evidenceUrls[item.id]"
                          :src="evidenceUrls[item.id]"
                          controls
                          class="evidence-audio"
                        />
                        <ImuStabilityChart
                          v-else-if="item.type === 'imu' && evidenceUrls[item.id]"
                          :evidence-url="evidenceUrls[item.id]"
                          :item-id="group.answer.itemId"
                          :result-tone="RESULT_TONE[group.answer.result] ?? 'mute'"
                        />
                        <span v-else class="evidence-unresolved">
                          {{ evidenceUrls[item.id] === undefined ? '無法載入證據檔案' : item.type }}
                        </span>
                      </div>
                    </div>

                    <div v-if="group.answer.aiResult" class="ai-block">
                      <dl class="admin-kv">
                        <div>
                          <dt>模型</dt>
                          <dd class="mono">
                            {{ group.answer.aiResult.model }} ({{
                              group.answer.aiResult.modelVersion
                            }})
                          </dd>
                        </div>
                        <div>
                          <dt>信心值</dt>
                          <dd>{{ group.answer.aiResult.confidence ?? '—' }}</dd>
                        </div>
                        <div>
                          <dt>標籤</dt>
                          <dd>{{ group.answer.aiResult.label }}</dd>
                        </div>
                        <div v-if="group.answer.aiResult.details.note">
                          <dt>AI 說明</dt>
                          <dd>{{ group.answer.aiResult.details.note }}</dd>
                        </div>
                        <div v-if="(group.answer.aiResult.details.findings ?? []).length > 0">
                          <dt>觀察項目</dt>
                          <dd>{{ (group.answer.aiResult.details.findings ?? []).join('、') }}</dd>
                        </div>
                        <div v-if="group.answer.aiResult.details.attempts.length > 1">
                          <dt>重試次數</dt>
                          <dd>
                            {{ group.answer.aiResult.details.finalAttempt }} /
                            {{ group.answer.aiResult.details.attempts.length }}
                          </dd>
                        </div>
                      </dl>
                      <details class="ai-raw">
                        <summary>完整 AI 回應（JSON）</summary>
                        <pre class="admin-json">{{
                          JSON.stringify(group.answer.aiResult, null, 2)
                        }}</pre>
                      </details>
                    </div>
                    <p v-else class="answer-manual">人工判定項目，無 AI 回應。</p>

                    <div v-if="group.aiSubAnswers.length > 0" class="ai-sub-list">
                      <div v-for="sub in group.aiSubAnswers" :key="sub.itemId" class="ai-sub-item">
                        <div class="answer-head">
                          <span class="mono answer-id">{{ sub.itemId }}</span>
                          <span class="answer-title">{{ itemTitle(sub.itemId) }}</span>
                          <span
                            v-if="apiFailed(sub)"
                            class="admin-fail-badge"
                            :title="apiFailureReason(sub) ?? 'AI 分析失敗'"
                            >!</span
                          >
                          <span
                            v-else
                            class="admin-pill"
                            :class="RESULT_TONE[sub.result] ?? 'mute'"
                          >
                            {{ RESULT_LABEL[sub.result] ?? sub.result }}
                          </span>
                        </div>
                        <div v-if="sub.aiResult" class="ai-block">
                          <dl class="admin-kv">
                            <div>
                              <dt>模型</dt>
                              <dd class="mono">
                                {{ sub.aiResult.model }} ({{ sub.aiResult.modelVersion }})
                              </dd>
                            </div>
                            <div>
                              <dt>信心值</dt>
                              <dd>{{ sub.aiResult.confidence ?? '—' }}</dd>
                            </div>
                            <div>
                              <dt>標籤</dt>
                              <dd>{{ sub.aiResult.label }}</dd>
                            </div>
                            <div v-if="sub.aiResult.details.note">
                              <dt>AI 說明</dt>
                              <dd>{{ sub.aiResult.details.note }}</dd>
                            </div>
                            <div v-if="(sub.aiResult.details.findings ?? []).length > 0">
                              <dt>觀察項目</dt>
                              <dd>{{ (sub.aiResult.details.findings ?? []).join('、') }}</dd>
                            </div>
                            <div v-if="sub.aiResult.details.attempts.length > 1">
                              <dt>重試次數</dt>
                              <dd>
                                {{ sub.aiResult.details.finalAttempt }} /
                                {{ sub.aiResult.details.attempts.length }}
                              </dd>
                            </div>
                          </dl>
                          <details class="ai-raw">
                            <summary>完整 AI 回應（JSON）</summary>
                            <pre class="admin-json">{{
                              JSON.stringify(sub.aiResult, null, 2)
                            }}</pre>
                          </details>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-kv {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 8px;
}

.admin-kv div {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.admin-kv dt {
  flex: 0 0 auto;
  min-width: 90px;
  color: var(--muted);
}

.admin-kv dd {
  margin: 0;
  flex: 1;
}

.admin-json {
  margin: 0;
  padding: 10px 12px;
  background: var(--ground);
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.answer-section-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-section-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.answer-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.answer-section-title {
  flex: 1;
  font-weight: 700;
  font-size: 13.5px;
}

.answer-section-chevron {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  color: var(--muted);
  transition: transform 0.15s ease;
}

.answer-section-chevron.open {
  transform: rotate(180deg);
}

.answer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 12px 12px;
  border-top: 1px solid var(--line);
}

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.18s ease,
    opacity 0.18s ease;
  overflow: hidden;
  max-height: 4000px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.answer-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.answer-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.answer-id {
  font-size: 12px;
}

.answer-title {
  font-weight: 600;
  flex: 1;
}

.answer-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
}

.engine-audio-analysis {
  margin: 12px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--action-soft);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.engine-type-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--text);
}

.engine-audio-summary-line {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.phase-invalid {
  color: var(--danger, #d33);
  font-weight: 700;
}

.engine-audio-raw {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--muted);
}

.engine-audio-raw pre {
  margin: 6px 0 0;
  max-height: 260px;
  overflow: auto;
  padding: 8px;
  border-radius: 6px;
  background: var(--surface, #f6f6f6);
  white-space: pre-wrap;
  word-break: break-word;
}

.answer-manual {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
  font-style: italic;
}

.admin-fail-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--risk);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: help;
}

.admin-unanswered-badge {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 1px 8px;
}

.answer-fail-reason {
  margin: 0;
  font-size: 12.5px;
  color: var(--risk);
}

.evidence-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evidence-tile {
  width: 140px;
  flex: 0 0 auto;
}

.evidence-tile-wide {
  width: 260px;
}

.evidence-media {
  width: 140px;
  max-height: 180px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #000;
  display: block;
  object-fit: contain;
}

.evidence-audio {
  width: 260px;
  display: block;
}

.evidence-unresolved {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 80px;
  border-radius: 6px;
  border: 1px dashed var(--line);
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  padding: 4px;
}

.ai-block {
  border-top: 1px dashed var(--line);
  padding-top: 6px;
}

.ai-raw summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--action);
}

.ai-sub-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  padding-left: 12px;
  border-left: 2px solid var(--line);
}

.ai-sub-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--ground);
  border-radius: 6px;
}

.ai-sub-item .answer-title {
  font-weight: 500;
  font-size: 12.5px;
}
</style>
