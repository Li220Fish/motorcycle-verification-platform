import { computed, reactive, ref, watch, type Ref } from 'vue'

import type { ReportSection } from '@/components/verification/InspectionReportBody.vue'
import type { DiagramMarker } from '@/components/verification/VehicleDiagramOverview.vue'
import { aiVisionItemsForAprItem } from '@/data/verification/ai-vision-items'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_SESSION_ITEM_IDS,
  ENGINE_STARTUP_ITEM_IDS,
} from '@/data/verification/engine-session'
import { RESULT_TONE } from '@/data/verification/result-labels'
import { useI18n } from '@/composables/useI18n'
import { storageService } from '@/services/firebase/storage.service'
import {
  PROBE_EVIDENCE_ITEM_ID,
  readProbeEvidence,
  type ProbeEvidenceMetadata,
  type ProbeSessionKind,
} from '@/services/probe/probe-evidence'
import { PROBE_STAGES } from '@/services/probe/probe-protocol'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type {
  AnswerResultValue,
  VerificationAnswer,
  VerificationEvidence,
} from '@/types/verification-evidence'

/**
 * Everything VerificationReportView.vue (owner/signed-in-stranger, full
 * detail) and SharedReportView.vue (anonymous, restricted detail — see
 * InspectionReportBody.vue's `restricted` prop) both need to turn a loaded
 * verification into report sections/diagram markers. Pulled out of
 * VerificationReportView.vue rather than duplicated — same reasoning
 * scoring.service.ts's own doc comment gives for centralizing a formula
 * that used to be copy-pasted with a diverging edge case.
 *
 * Deliberately does NOT own `vehicleTitle` — VerificationReportView.vue
 * falls back to a `route.query` brand/model snapshot (passed from
 * MarketplaceListingView.vue) that SharedReportView.vue has no equivalent
 * of, so each view keeps that small piece itself.
 */
export function useInspectionReportSections(verificationId: Ref<string | undefined>) {
  const verificationStore = useVerificationStore()
  const vehicleStore = useVehicleStore()
  const { t, tItem, formatPrice, localeTag } = useI18n()
  const resultLabel = (result: AnswerResultValue): string => t('report', result)

  // Capture UI = 3 Session, but Report = 6 個檢測結果 (spec §44) — the report
  // nests ENG-03..08 under their session labels instead of flattening them,
  // same underlying items, just grouped for readability.
  const ENGINE_ITEM_GROUP_KEY: Record<string, 'groupStartup' | 'groupIdle' | 'groupRev'> = {
    [ENGINE_STARTUP_ITEM_IDS[0]]: 'groupStartup',
    [ENGINE_STARTUP_ITEM_IDS[1]]: 'groupStartup',
    [ENGINE_IDLE_ITEM_IDS[0]]: 'groupIdle',
    [ENGINE_IDLE_ITEM_IDS[1]]: 'groupIdle',
    [ENGINE_REV_ITEM_IDS[0]]: 'groupRev',
    [ENGINE_REV_ITEM_IDS[1]]: 'groupRev',
  }

  const RESULT_SEVERITY: Record<AnswerResultValue, number> = {
    attention: 3,
    unsure: 2,
    normal: 1,
    not_applicable: 0,
  }

  function engineAudioEvidence(): VerificationEvidence | undefined {
    return (verificationStore.evidenceByItem[ENGINE_STARTUP_ITEM_IDS[0]] ?? []).find(
      (e) => e.type === 'audio',
    )
  }

  function engineTypeNoteFromEvidence(): string | undefined {
    const engineAudioV3 = engineAudioEvidence()?.metadata?.engineAudioV3 as
      { engineTypeNote?: string } | undefined
    return engineAudioV3?.engineTypeNote
  }

  function engineAudioUrl(): string | undefined {
    const evidence = engineAudioEvidence()
    return evidence ? resolvedPhotoUrls[evidence.id] : undefined
  }

  function effectiveItemResult(itemId: string): VerificationAnswer | undefined {
    const baseAnswer = verificationStore.answers[itemId]
    const aiAnswers = aiVisionItemsForAprItem(itemId)
      .map((aiItem) => verificationStore.answers[aiItem.id])
      .filter((answer): answer is VerificationAnswer => !!answer?.aiResult)
    if (aiAnswers.length === 0) return baseAnswer

    const worst = aiAnswers.reduce((worstSoFar, candidate) =>
      RESULT_SEVERITY[candidate.result] > RESULT_SEVERITY[worstSoFar.result]
        ? candidate
        : worstSoFar,
    )
    const notes = aiAnswers
      .filter((answer) => answer.result !== 'normal')
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

  interface DashboardOcrResult {
    text: string | null
    confidence: number | null
    note: string | null
  }
  function latestOcrResult(itemId: string): DashboardOcrResult | null {
    const photos = (verificationStore.evidenceByItem[itemId] ?? []).filter(
      (evidence) => evidence.type === 'photo',
    )
    const latest = photos.reduce<VerificationEvidence | null>(
      (latestSoFar, evidence) =>
        !latestSoFar || evidence.createdAt > latestSoFar.createdAt ? evidence : latestSoFar,
      null,
    )
    return (latest?.metadata?.ocr as DashboardOcrResult | undefined) ?? null
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(localeTag())
  }

  const inspectedDate = computed(() => {
    const verification = verificationStore.currentVerification
    if (!verification) return '—'
    return formatDate(verification.completedAt ?? verification.createdAt)
  })

  const resolvedPhotoUrls = reactive<Record<string, string>>({})
  const RESOLVABLE_EVIDENCE_TYPES: VerificationEvidence['type'][] = ['photo', 'audio']

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
        if (!RESOLVABLE_EVIDENCE_TYPES.includes(evidence.type) || !evidence.remoteUrl) continue
        if (!(evidence.id in resolvedPhotoUrls))
          void resolvePhotoUrl(evidence.id, evidence.remoteUrl)
      }
    },
    { deep: true, immediate: true },
  )

  // 二手價區間 — admin-entered reference range on the vehicle's model
  // (ModelsSection.vue), shown as the report's own last section when set.
  // modelId resolution prefers the buyer-flow vehicleSnapshot (vehicles/{id}
  // is owner/admin-scoped — a buyer re-verifying a seller's vehicle, or an
  // anonymous SharedReportView.vue visitor, can never read it directly),
  // falling back to the live vehicle doc for the owner's own report.
  const usedPriceRangeTwd = ref<{ min: number; max: number } | null>(null)
  watch(
    () =>
      verificationStore.currentVerification?.vehicleSnapshot?.modelId ??
      vehicleStore.currentVehicle?.modelId,
    async (modelId) => {
      usedPriceRangeTwd.value = null
      if (!modelId) return
      try {
        const profile = await vehicleModelService.getProfile(modelId)
        usedPriceRangeTwd.value = profile?.usedPriceRangeTwd ?? null
      } catch {
        usedPriceRangeTwd.value = null
      }
    },
    { immediate: true },
  )

  const usedPriceRangeSection = computed<ReportSection | null>(() => {
    const range = usedPriceRangeTwd.value
    if (!range) return null
    return {
      id: 'used-price-range',
      title: t('report', 'priceTitle'),
      statusLabel: t('report', 'priceStatus'),
      statusTone: 'neutral',
      items: [
        {
          id: 'used-price-range-value',
          title: t('report', 'priceItem'),
          badgeLabel: `${formatPrice(range.min)} ~ ${formatPrice(range.max)}`,
          badgeTone: 'primary',
          note: t('report', 'priceNote'),
          required: false,
        },
      ],
    }
  })

  const sections = computed<ReportSection[]>(() => {
    const base = verificationStore.sections.map((section) => {
      const answers = section.items
        .map((item) => effectiveItemResult(item.id))
        .filter((answer) => !!answer)
      let statusLabel = t('report', 'statusNotChecked')
      let statusTone: ReportSection['statusTone'] = 'neutral'
      if (answers.length > 0) {
        if (answers.some((answer) => answer.result === 'attention')) {
          statusLabel = t('report', 'statusAttention')
          statusTone = 'warning'
        } else if (answers.some((answer) => answer.result === 'unsure')) {
          statusLabel = t('report', 'statusPending')
          statusTone = 'warning'
        } else {
          statusLabel = t('report', 'statusGood')
          statusTone = 'success'
        }
      }

      return {
        id: section.id,
        title: tItem(section.id, section.title),
        statusLabel,
        statusTone,
        engineTypeNote: section.items.some((item) => ENGINE_SESSION_ITEM_IDS.includes(item.id))
          ? engineTypeNoteFromEvidence()
          : undefined,
        audioUrl: section.items.some((item) => ENGINE_SESSION_ITEM_IDS.includes(item.id))
          ? engineAudioUrl()
          : undefined,
        items: section.items.map((item) => {
          const answer = effectiveItemResult(item.id)
          const photos = (verificationStore.evidenceByItem[item.id] ?? [])
            .filter((evidence) => evidence.type === 'photo')
            .map((evidence) => resolvedPhotoUrls[evidence.id] ?? evidence.localUri)
            .filter((url): url is string => !!url)
          const disclosureLabel = item.disclosureOptions?.length
            ? answer?.selections
                ?.map(
                  (value) =>
                    item.disclosureOptions?.find((option) => option.value === value)?.label ??
                    value,
                )
                .join('、')
            : undefined
          const note = [disclosureLabel, answer?.note].filter(Boolean).join('｜') || undefined
          const ocr = latestOcrResult(item.id)
          return {
            id: item.id,
            title: tItem(item.id, item.title),
            badgeLabel: answer ? resultLabel(answer.result) : t('report', 'notChecked'),
            badgeTone: answer ? RESULT_TONE[answer.result] : 'neutral',
            note,
            aiNote:
              (answer?.result !== 'normal' ? answer?.aiResult?.details.note : undefined) ??
              ocr?.note ??
              undefined,
            ocrText: ocr?.text ?? undefined,
            photos,
            groupLabel: ENGINE_ITEM_GROUP_KEY[item.id]
              ? t('report', ENGINE_ITEM_GROUP_KEY[item.id])
              : undefined,
            required: item.required,
          }
        }),
      }
    })
    return usedPriceRangeSection.value ? [...base, usedPriceRangeSection.value] : base
  })

  type MarkerLabelKey =
    | 'mAppearance'
    | 'mHandle'
    | 'mHeadlight'
    | 'mSignalF'
    | 'mFork'
    | 'mBrake'
    | 'mEngine'
    | 'mTaillight'
    | 'mSignalR'
  interface DiagramMarkerDef {
    key: string
    label: MarkerLabelKey
    anchor: [number, number]
    itemIds: string[]
  }
  const DIAGRAM_MARKER_DEFS: DiagramMarkerDef[] = [
    {
      key: 'appearance',
      label: 'mAppearance',
      anchor: [46, 20],
      itemIds: ['APR-left-side', 'APR-right-side', 'APR-rear'],
    },
    { key: 'handle', label: 'mHandle', anchor: [41, 33], itemIds: ['APR-triple-clamp'] },
    {
      key: 'headlight',
      label: 'mHeadlight',
      anchor: [28, 43],
      itemIds: ['ELEC-01', 'ELEC-02', 'ELEC-03'],
    },
    { key: 'signal_f', label: 'mSignalF', anchor: [18, 46], itemIds: ['ELEC-06', 'ELEC-07'] },
    {
      key: 'fork',
      label: 'mFork',
      anchor: [23, 63],
      itemIds: ['APR-front-suspension-left', 'APR-front-suspension-right'],
    },
    {
      key: 'brake',
      label: 'mBrake',
      anchor: [33, 84],
      itemIds: ['APR-front-brake', 'APR-rear-brake'],
    },
    {
      key: 'engine',
      label: 'mEngine',
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
    { key: 'taillight', label: 'mTaillight', anchor: [75, 45], itemIds: ['ELEC-04', 'ELEC-05'] },
    { key: 'signal_r', label: 'mSignalR', anchor: [66, 60], itemIds: ['ELEC-08', 'ELEC-09'] },
  ]

  function resolveDiagramMarker(def: DiagramMarkerDef): DiagramMarker {
    const answers = def.itemIds
      .map((itemId) => effectiveItemResult(itemId))
      .filter((answer): answer is VerificationAnswer => !!answer)
    if (answers.length === 0) {
      return {
        key: def.key,
        label: t('report', def.label),
        anchor: def.anchor,
        badgeLabel: t('report', 'notChecked'),
        tone: 'neutral',
        itemIds: def.itemIds,
      }
    }
    const worst = answers.reduce((worstSoFar, candidate) =>
      RESULT_SEVERITY[candidate.result] > RESULT_SEVERITY[worstSoFar.result]
        ? candidate
        : worstSoFar,
    )
    return {
      key: def.key,
      label: t('report', def.label),
      anchor: def.anchor,
      badgeLabel: resultLabel(worst.result),
      tone: RESULT_TONE[worst.result],
      itemIds: def.itemIds,
    }
  }

  const diagramMarkers = computed<DiagramMarker[]>(() =>
    DIAGRAM_MARKER_DEFS.map(resolveDiagramMarker),
  )

  const loading = ref(true)
  const loadError = ref<string | null>(null)

  watch(
    verificationId,
    async (id) => {
      if (!id) return
      loading.value = true
      loadError.value = null
      try {
        await verificationStore.loadFlow(id)
        if (!verificationStore.currentVerification) {
          loadError.value = 'not-found'
        }
      } catch {
        // A denied read (not public, or doesn't exist) looks identical to
        // the caller from here — loadFlow swallows most of this itself, but
        // a thrown error (e.g. the initial get()) still needs to resolve to
        // the same "can't show this" state rather than an unhandled
        // rejection.
        loadError.value = 'denied'
      } finally {
        loading.value = false
      }
    },
    { immediate: true },
  )

  // Probe readings (only present when this inspection opted into the probe)
  // — latest per session+stage, cold stages first, then 熱車, then a manual
  // PREP-04 reading. Kept outside `sections`: the probe is optional extra
  // data, so it never feeds a section's status badge or the score.
  const probeReadings = computed<ProbeEvidenceMetadata[]>(() => {
    const evidence = [
      ...(verificationStore.evidenceByItem[PROBE_EVIDENCE_ITEM_ID] ?? []),
      ...(verificationStore.evidenceByItem['PREP-04'] ?? []),
    ].sort((a, b) => a.createdAt - b.createdAt)
    const latest = new Map<string, ProbeEvidenceMetadata>()
    for (const item of evidence) {
      const reading = readProbeEvidence(item)
      if (reading) latest.set(`${reading.session}:${reading.stage}`, reading)
    }
    const sessionOrder: ProbeSessionKind[] = ['cold', 'hot', 'manual']
    return [...latest.values()].sort(
      (a, b) =>
        sessionOrder.indexOf(a.session) - sessionOrder.indexOf(b.session) ||
        PROBE_STAGES.indexOf(a.stage) - PROBE_STAGES.indexOf(b.stage),
    )
  })

  return { sections, diagramMarkers, inspectedDate, loading, loadError, probeReadings }
}
