<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import type { ReportSection } from '@/components/verification/InspectionReportBody.vue'
import type { DiagramMarker } from '@/components/verification/VehicleDiagramOverview.vue'
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
    aiResult:
      notes.length > 0
        ? { ...worst.aiResult!, details: { ...worst.aiResult!.details, note: notes.join('\n') } }
        : undefined,
  }
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

const inspectedDate = computed(() => {
  const verification = verificationStore.currentVerification
  if (!verification) return '—'
  return formatDate(verification.completedAt ?? verification.createdAt)
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
    const answers = section.items
      .map((item) => effectiveItemResult(item.id))
      .filter((answer) => !!answer)
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
        // Multi-select disclosure items (PREP-02) — show which boxes were
        // checked alongside the free-text remark, not just the derived
        // normal/attention badge (which alone can't say WHAT was disclosed).
        const disclosureLabel = item.disclosureOptions?.length
          ? answer?.selections
              ?.map(
                (value) =>
                  item.disclosureOptions?.find((option) => option.value === value)?.label ?? value,
              )
              .join('、')
          : undefined
        const note = [disclosureLabel, answer?.note].filter(Boolean).join('｜') || undefined
        return {
          id: item.id,
          title: item.title,
          badgeLabel: answer ? RESULT_LABEL[answer.result] : '未檢查',
          badgeTone: answer ? RESULT_TONE[answer.result] : 'neutral',
          note,
          aiNote: answer?.aiResult?.details.note,
          photos,
          groupLabel: ENGINE_ITEM_GROUP_LABEL[item.id],
          required: item.required,
        }
      }),
    }
  }),
)

// Whole-vehicle diagram (VehicleDiagramOverview.vue) — a handful of dots
// standing in for the ~30 real checklist items, so several dots deliberately
// roll up multiple item ids into one worst-of status (引擎 alone covers 9).
// Anchors are hand-placed percentage points on that component's 700x400
// illustration, not derived from any shared coordinate system. 後視鏡/前輪胎/
// 後輪胎 from the original design reference have no backing checklist item
// any more (dropped in the Verification v2 migration — see photo-slots.ts's
// header comment) and are intentionally left out rather than showing a
// permanently-empty "未檢查" dot for a check that no longer exists.
interface DiagramMarkerDef {
  key: string
  label: string
  anchor: [number, number]
  itemIds: string[]
}
const DIAGRAM_MARKER_DEFS: DiagramMarkerDef[] = [
  {
    key: 'appearance',
    label: '外觀',
    anchor: [46, 20],
    itemIds: ['APR-left-side', 'APR-right-side', 'APR-rear'],
  },
  { key: 'handle', label: '把手／龍頭', anchor: [41, 33], itemIds: ['APR-triple-clamp'] },
  {
    key: 'headlight',
    label: '前大燈',
    anchor: [28, 43],
    itemIds: ['ELEC-01', 'ELEC-02', 'ELEC-03'],
  },
  { key: 'signal_f', label: '前方向燈', anchor: [18, 46], itemIds: ['ELEC-06', 'ELEC-07'] },
  { key: 'fork', label: '前避震', anchor: [23, 63], itemIds: ['APR-front-suspension'] },
  {
    key: 'brake',
    label: '煞車系統',
    anchor: [33, 84],
    itemIds: ['APR-front-brake', 'APR-rear-brake'],
  },
  {
    key: 'engine',
    label: '引擎',
    anchor: [49.5, 68],
    itemIds: [
      'APR-engine-bottom',
      'ENG-01',
      'ENG-02',
      'ENG-03',
      'ENG-04',
      'ENG-05',
      'ENG-06',
      'ENG-07',
      'ENG-08',
    ],
  },
  { key: 'taillight', label: '尾燈', anchor: [75, 45], itemIds: ['ELEC-04', 'ELEC-05'] },
  { key: 'signal_r', label: '後方向燈', anchor: [66, 60], itemIds: ['ELEC-08', 'ELEC-09'] },
]

function resolveDiagramMarker(def: DiagramMarkerDef): DiagramMarker {
  const answers = def.itemIds
    .map((itemId) => effectiveItemResult(itemId))
    .filter((answer): answer is VerificationAnswer => !!answer)
  if (answers.length === 0) {
    return {
      key: def.key,
      label: def.label,
      anchor: def.anchor,
      badgeLabel: '未檢查',
      tone: 'neutral',
      itemIds: def.itemIds,
    }
  }
  const worst = answers.reduce((worstSoFar, candidate) =>
    RESULT_SEVERITY[candidate.result] > RESULT_SEVERITY[worstSoFar.result] ? candidate : worstSoFar,
  )
  return {
    key: def.key,
    label: def.label,
    anchor: def.anchor,
    badgeLabel: RESULT_LABEL[worst.result],
    tone: RESULT_TONE[worst.result],
    itemIds: def.itemIds,
  }
}

const diagramMarkers = computed<DiagramMarker[]>(() =>
  DIAGRAM_MARKER_DEFS.map(resolveDiagramMarker),
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
      :sections="sections"
      :diagram-markers="diagramMarkers"
    />
  </div>
</template>
