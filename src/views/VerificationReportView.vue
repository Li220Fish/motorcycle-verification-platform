<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import type { ReportSection } from '@/components/verification/InspectionReportBody.vue'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_STARTUP_ITEM_IDS,
} from '@/data/verification/engine-session'
import { RESULT_LABEL, RESULT_TONE } from '@/data/verification/result-labels'

// Capture UI = 3 Session, but Report = 6 個檢測結果 (spec §44) — the report
// nests ENG-03..08 under their session labels instead of flattening them,
// same underlying items, just grouped for readability.
const ENGINE_ITEM_GROUP_LABEL: Record<string, string> = {
  [ENGINE_STARTUP_ITEM_IDS[0]]: '啟動檢測',
  [ENGINE_STARTUP_ITEM_IDS[1]]: '啟動檢測',
  [ENGINE_IDLE_ITEM_IDS[0]]: '怠速檢測',
  [ENGINE_IDLE_ITEM_IDS[1]]: '怠速檢測',
  [ENGINE_REV_ITEM_IDS[0]]: '油門檢測',
  [ENGINE_REV_ITEM_IDS[1]]: '油門檢測',
}

import { aiVisionItemsForAprItem } from '@/data/verification/ai-vision-items'
import { storageService } from '@/services/firebase/storage.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { AnswerResultValue, VerificationAnswer } from '@/types/verification-evidence'

// Group A/B/C AI-vision items (functions/src/ai/prompts/groups/*.ts) have no
// checklist itemId of their own — each one analyzes one or more of the 20
// real APR-* photos. Per product decision, these are NOT shown as a separate
// "AI 影像判定" report category: each one's verdict/note is merged into the
// display of whichever APR-* item(s) it actually analyzed (see
// effectiveItemResult below). Only the admin backend needs the raw AI
// category id for traceability — this report only ever shows plain text.
const RESULT_SEVERITY: Record<AnswerResultValue, number> = {
  attention: 3,
  unsure: 2,
  normal: 1,
  not_applicable: 0,
}

/** The APR item's own answer is just a client-set placeholder (拍完就是完成,
 *  see VerificationItem.vue) — never a real judgement. When one or more
 *  Group A/B/C items have actually analyzed this APR item's photo, their
 *  worst result + combined notes replace that placeholder entirely; only
 *  falls back to the placeholder when no AI item covers this APR item at
 *  all, or its analysis hasn't landed yet. */
function effectiveItemResult(itemId: string): VerificationAnswer | undefined {
  const baseAnswer = verificationStore.answers[itemId]
  const aiAnswers = aiVisionItemsForAprItem(itemId)
    .map((aiItem) => verificationStore.answers[aiItem.id])
    .filter((answer): answer is VerificationAnswer => !!answer?.aiResult)
  if (aiAnswers.length === 0) return baseAnswer

  const worst = aiAnswers.reduce((worstSoFar, candidate) =>
    RESULT_SEVERITY[candidate.result] > RESULT_SEVERITY[worstSoFar.result] ? candidate : worstSoFar,
  )
  const notes = aiAnswers
    .map((answer) => answer.aiResult?.details.note)
    .filter((note): note is string => !!note)
  return {
    itemId,
    result: worst.result,
    note: baseAnswer?.note,
    updatedAt: worst.updatedAt,
    aiResult: notes.length > 0 ? { ...worst.aiResult!, details: { ...worst.aiResult!.details, note: notes.join('\n') } } : undefined,
  }
}

// PREP-03 (驗車環境檢測)'s own Answer never gets an aiResult — the Trusted
// Backend writes its analysis only to Verification.environmentContext (see
// analyze-environment.ts), deliberately NOT as a vehicle-condition judgement
// (PREP-03's own helpText: "不直接影響車況判定結果"). So this only ever adds
// informational note text to that one item, never touches its result/badge.
const ENVIRONMENT_WARNING_LABELS: Record<string, string> = {
  moderate_backlightRisk: '中度逆光風險',
  high_backlightRisk: '高度逆光風險',
  moderate_reflectionRisk: '中度反光風險',
  high_reflectionRisk: '高度反光風險',
  moderate_shadowRisk: '中度陰影風險',
  high_shadowRisk: '高度陰影風險',
  moderate_obstructionRisk: '中度遮擋風險',
  high_obstructionRisk: '高度遮擋風險',
  moderate_movingObjectInterference: '中度移動物體干擾',
  high_movingObjectInterference: '高度移動物體干擾',
  poor_lighting: '光線不足',
  ambient_audio_unsuitable: '環境音不適合分析',
}

const props = defineProps<{ id: string }>()

const route = useRoute()
const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-TW')
}

/**
 * A stranger viewing a public verification's report (from a Marketplace
 * listing) can't read the backing `vehicles` doc — it's owner/admin-scoped
 * even when the verification itself is public (that scoping only ever
 * applies to the verification + its answers/evidence, not the vehicle
 * record it points at). MarketplaceListingView.vue already has brand/model/
 * year on hand (its own vehicleSnapshot) and passes them as query params so
 * this title doesn't depend on a fetch that'll just fail for that viewer;
 * the vehicle owner navigating here directly (e.g. from VehicleDetailView)
 * has no query params and falls back to the real fetch below.
 */
const vehicleTitle = computed(() => {
  const queryBrand = route.query.brand
  const queryModel = route.query.model
  if (typeof queryBrand === 'string' && typeof queryModel === 'string') {
    const queryYear = route.query.year
    return `${queryYear ? `${queryYear} ` : ''}${queryBrand} ${queryModel}`.trim()
  }
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return '—'
  return `${vehicle.manufactureYear ? `${vehicle.manufactureYear} ` : ''}${vehicle.brand} ${vehicle.model}`.trim()
})

const environmentNote = computed<string | undefined>(() => {
  const context = verificationStore.currentVerification?.environmentContext
  if (!context) return undefined
  const readableWarnings = context.warnings.map((warning) => ENVIRONMENT_WARNING_LABELS[warning] ?? warning)
  const suitabilityText = context.quality.overallSuitable
    ? '整體環境適合拍攝分析。'
    : '整體環境可能不利於後續影像／聲音分析。'
  return readableWarnings.length > 0
    ? `${suitabilityText}（${readableWarnings.join('、')}）`
    : suitabilityText
})

const inspectedDate = computed(() => {
  const verification = verificationStore.currentVerification
  if (!verification) return '—'
  return formatDate(verification.completedAt ?? verification.createdAt)
})

// A real, derived number — not a fabricated demo score: the share of this
// verification's own answered items (excluding 不適用) that came back 正常.
const score = computed<number | null>(() => {
  const eligible = Object.values(verificationStore.answers).filter(
    (answer) => answer.result !== 'not_applicable',
  )
  if (eligible.length === 0) return null
  const normalCount = eligible.filter((answer) => answer.result === 'normal').length
  return Math.round((normalCount / eligible.length) * 100)
})

// evidence.remoteUrl is a Storage object path for real uploads (see
// storageService.uploadEvidenceFile) — resolved to fresh, rules-checked URLs
// here, keyed by evidence id, same pattern as EvidencePreview.vue, since
// `sections` below is a synchronous computed and can't await per-photo.
const resolvedPhotoUrls = reactive<Record<string, string>>({})

async function resolvePhotoUrl(id: string, path: string): Promise<void> {
  if (/^https?:\/\//.test(path)) {
    resolvedPhotoUrls[id] = path
    return
  }
  try {
    resolvedPhotoUrls[id] = await storageService.resolveDownloadUrl(path)
  } catch {
    delete resolvedPhotoUrls[id]
  }
}

watch(
  () => verificationStore.evidenceByItem,
  (byItem) => {
    for (const evidence of Object.values(byItem).flat()) {
      if (evidence.type !== 'photo' || !evidence.remoteUrl) continue
      if (!(evidence.id in resolvedPhotoUrls)) void resolvePhotoUrl(evidence.id, evidence.remoteUrl)
    }
  },
  { deep: true, immediate: true },
)

const sections = computed<ReportSection[]>(() =>
  verificationStore.sections.map((section) => {
    const answers = section.items.map((item) => effectiveItemResult(item.id)).filter((answer) => !!answer)
    let statusLabel = '尚未檢查'
    let statusTone: ReportSection['statusTone'] = 'neutral'
    if (answers.length > 0) {
      if (answers.some((answer) => answer.result === 'attention')) {
        statusLabel = '需要注意'
        statusTone = 'warning'
      } else if (answers.some((answer) => answer.result === 'unsure')) {
        statusLabel = '待確認'
        statusTone = 'warning'
      } else {
        statusLabel = '良好'
        statusTone = 'success'
      }
    }

    return {
      id: section.id,
      title: section.title,
      statusLabel,
      statusTone,
      items: section.items.map((item) => {
        const answer = effectiveItemResult(item.id)
        const photos = (verificationStore.evidenceByItem[item.id] ?? [])
          .filter((evidence) => evidence.type === 'photo')
          .map((evidence) => resolvedPhotoUrls[evidence.id] ?? evidence.localUri)
          .filter((url): url is string => !!url)
        return {
          id: item.id,
          title: item.title,
          badgeLabel: answer ? RESULT_LABEL[answer.result] : '未檢查',
          badgeTone: answer ? RESULT_TONE[answer.result] : 'neutral',
          note: answer?.note,
          aiNote: item.id === 'PREP-03' ? environmentNote.value : answer?.aiResult?.details.note,
          photos,
          groupLabel: ENGINE_ITEM_GROUP_LABEL[item.id],
        }
      }),
    }
  }),
)

watch(
  () => verificationStore.currentVerification?.vehicleId,
  (vehicleId) => {
    // Swallow the error deliberately — a non-owner viewing a public report
    // has no read access to the vehicle doc (see vehicleTitle above), which
    // is expected, not a bug to surface.
    if (vehicleId) vehicleStore.fetchVehicle(vehicleId).catch(() => {})
  },
)

onMounted(() => {
  verificationStore.loadFlow(props.id)
})
</script>

<template>
  <div>
    <AppHeader title="檢驗報告" back />
    <InspectionReportBody
      :vehicle-title="vehicleTitle"
      :inspected-date="inspectedDate"
      :score="score"
      :sections="sections"
    />
  </div>
</template>
