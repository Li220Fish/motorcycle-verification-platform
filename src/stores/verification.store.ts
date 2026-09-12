import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getFlatItems, getFlowSections } from '@/data/verification'
import type {
  FlatVerificationItem,
  VerificationItem,
  VerificationSection,
} from '@/data/verification'
import { inferTransmissionType } from '@/data/verification/engine-session'
import {
  analyzeColdEngineTouchCheck,
  analyzeCoreVisionEngineBottom,
  analyzeCoreVisionFrontSuspension,
  analyzeCoreVisionRear,
  analyzeCoreVisionSides,
  analyzeDocumentMaintenance,
  analyzeEngineSensorSessionV2,
  analyzeOcrDashboard,
} from '@/services/firebase/ai-analysis.service'
import { verificationService } from '@/services/firebase/verification.service'
import { localDraftService } from '@/services/verification/local-draft.service'
import { useUploadQueueStore } from '@/stores/upload-queue.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { Verification, VerificationDraft } from '@/types/verification'
import type {
  AnswerResultValue,
  VerificationAnswer,
  VerificationEvidence,
} from '@/types/verification-evidence'

export interface SectionProgress {
  sectionId: string
  title: string
  done: number
  total: number
}

export interface MissingRequiredItem {
  itemId: string
  title: string
  sectionTitle: string
}

export const useVerificationStore = defineStore('verification', () => {
  const uploadQueueStore = useUploadQueueStore()
  const vehicleStore = useVehicleStore()

  const verifications = ref<Verification[]>([])
  const currentVerification = ref<Verification | null>(null)
  const loading = ref(false)
  let unsubscribeVerification: (() => void) | null = null

  /** Verification v2 §7 — Step 19 (鏈條/齒盤) only shows for chain-drive
   * vehicles; scooters/CVT never see it at all (not just "optional" — fully
   * absent from the flow). Mirrors the Trusted Backend's own
   * vehicle-context.service.ts default: unknown transmission is NOT treated
   * as "definitely no chain" (that would silently drop a possibly-required
   * photo) — only an explicit scooter/CVT reading hides the step; unknown or
   * chain-drive both keep it visible, same "資料不足才詢問" spirit via the
   * existing 傳動 picker rather than a brand-new prompt. */
  const hasExposedChainSprocket = computed(
    () => inferTransmissionType(vehicleStore.currentVehicle?.transmission) !== 'scooter',
  )

  // --- Runner state (V0.2): answers/evidence for the currently loaded flow ---
  const answers = ref<Record<string, VerificationAnswer>>({})
  const evidenceByItem = ref<Record<string, VerificationEvidence[]>>({})
  const flowLoaded = ref(false)

  async function fetchByVehicle(vehicleId: string): Promise<void> {
    loading.value = true
    try {
      verifications.value = await verificationService.listByVehicle(vehicleId)
    } finally {
      loading.value = false
    }
  }

  async function fetchVerification(id: string): Promise<void> {
    loading.value = true
    try {
      currentVerification.value = await verificationService.get(id)
    } finally {
      loading.value = false
    }
  }

  async function createVerification(draft: VerificationDraft): Promise<string> {
    const id = await verificationService.create(draft)
    await fetchByVehicle(draft.vehicleId)
    return id
  }

  async function completeVerification(id: string): Promise<void> {
    if (flowLoaded.value && missingRequiredItems.value.length > 0) {
      throw new Error('尚有必填項目未完成，無法結束驗證。')
    }
    if (flowLoaded.value && pendingRequiredUploads.value.length > 0) {
      throw new Error('正在完成最後幾筆資料上傳，請稍候再試一次。')
    }
    if (flowLoaded.value && failedRequiredUploads.value.length > 0) {
      throw new Error('有必填照片/影音上傳失敗，請重試後再完成驗證。')
    }
    if (flowLoaded.value && pendingRequiredAnalysis.value.length > 0) {
      throw new Error('AI 分析正在進行中，請稍候再試一次。')
    }
    if (flowLoaded.value && failedRequiredAnalysis.value.length > 0) {
      throw new Error('部分 AI 分析失敗，請重試後再完成驗證。')
    }
    await verificationService.complete(id)
    if (currentVerification.value?.id === id) {
      currentVerification.value = { ...currentVerification.value, status: 'completed' }
    }
  }

  async function saveTransactionDecision(
    id: string,
    decision: NonNullable<Verification['transactionDecision']>,
  ): Promise<void> {
    await verificationService.saveTransactionDecision(id, decision)
    if (currentVerification.value?.id === id) {
      currentVerification.value = { ...currentVerification.value, transactionDecision: decision }
    }
  }

  const flowKind = computed(() =>
    currentVerification.value?.type === 'buyer' ? 'buyer' : 'seller',
  )
  /** Step 19's item id is filtered out of the flow entirely for a
   * confirmed-scooter vehicle (see hasExposedChainSprocket above) — not
   * hidden via CSS, actually absent from flatItems/sections so it can never
   * appear in progress counts, the Hub, or missingRequiredItems. Same
   * treatment for any item declaring `visibleWhen` (e.g.
   * PREP-02-DAMAGE-PHOTOS, shown only once PREP-02 discloses 碰撞/其他) —
   * both checks live here so a single pass covers every conditionally-shown
   * item instead of one bespoke filter per condition. */
  function isItemVisible(item: VerificationItem): boolean {
    if (item.id === 'APR-transmission-chain' && !hasExposedChainSprocket.value) return false
    if (item.visibleWhen) {
      const selections = answers.value[item.visibleWhen.itemId]?.selections ?? []
      if (!item.visibleWhen.anyOfSelections.some((value) => selections.includes(value))) {
        return false
      }
    }
    return true
  }
  const flatItems = computed<FlatVerificationItem[]>(() =>
    currentVerification.value
      ? getFlatItems(flowKind.value).filter((flat) => isItemVisible(flat.item))
      : [],
  )
  const sections = computed<VerificationSection[]>(() => {
    if (!currentVerification.value) return []
    return getFlowSections(flowKind.value).map((section) => ({
      ...section,
      items: section.items.filter((item) => isItemVisible(item)),
    }))
  })

  /** Loads the verification + hydrates answers/evidence (Firestore, then local-draft overrides by recency). */
  async function loadFlow(verificationId: string): Promise<void> {
    loading.value = true
    flowLoaded.value = false
    unsubscribeVerification?.()
    try {
      currentVerification.value = await verificationService.get(verificationId)
      if (!currentVerification.value) return

      if (vehicleStore.currentVehicle?.id !== currentVerification.value.vehicleId) {
        vehicleStore.fetchVehicle(currentVerification.value.vehicleId).catch(() => {})
      }
      // Verification v2 — analysisStatus is written by the Trusted Backend
      // while this screen is open (background AI routes), so it needs a
      // live subscription rather than the one-time get() above; everything
      // else on the doc (status, transactionDecision, ...) stays consistent
      // with the client's own optimistic writes via the other setters below.
      unsubscribeVerification = verificationService.subscribeVerification(
        verificationId,
        (updated) => {
          if (updated && currentVerification.value?.id === verificationId) {
            currentVerification.value = { ...currentVerification.value, ...updated }
          }
        },
      )

      const localAnswers = localDraftService.loadAnswers(verificationId)
      const localEvidence = localDraftService.loadEvidence(verificationId)
      const [remoteAnswers, remoteEvidence] = await Promise.all([
        verificationService.listAnswers(verificationId).catch(() => [] as VerificationAnswer[]),
        verificationService.listEvidence(verificationId).catch(() => [] as VerificationEvidence[]),
      ])

      const mergedAnswers: Record<string, VerificationAnswer> = {}
      for (const answer of remoteAnswers) mergedAnswers[answer.itemId] = answer
      for (const answer of localAnswers) {
        const existing = mergedAnswers[answer.itemId]
        if (!existing || answer.updatedAt > existing.updatedAt)
          mergedAnswers[answer.itemId] = answer
      }
      answers.value = mergedAnswers

      const mergedEvidence: Record<string, VerificationEvidence[]> = {}
      const seenEvidenceIds = new Set<string>()
      for (const evidence of [...remoteEvidence, ...localEvidence]) {
        if (seenEvidenceIds.has(evidence.id)) continue
        seenEvidenceIds.add(evidence.id)
        const list = mergedEvidence[evidence.itemId] ?? []
        list.push(evidence)
        mergedEvidence[evidence.itemId] = list
      }
      evidenceByItem.value = mergedEvidence

      // best-effort push of anything that only exists locally (offline draft catch-up)
      for (const answer of localAnswers) {
        verificationService.saveAnswer(verificationId, answer).catch(() => {})
      }
      for (const evidence of localEvidence) {
        verificationService.saveEvidence(evidence).catch(() => {})
      }

      flowLoaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function saveAnswer(
    itemId: string,
    result: AnswerResultValue,
    note?: string,
    formData?: Record<string, string>,
    selections?: string[],
  ): Promise<void> {
    if (!currentVerification.value) return
    const verificationId = currentVerification.value.id
    const answer: VerificationAnswer = {
      itemId,
      result,
      note,
      formData,
      selections,
      updatedAt: Date.now(),
    }

    answers.value = { ...answers.value, [itemId]: answer }
    localDraftService.saveAnswer(verificationId, answer)
    verificationService.saveAnswer(verificationId, answer).catch(() => {})

    if (currentVerification.value.status === 'draft') {
      currentVerification.value = { ...currentVerification.value, status: 'in_progress' }
      verificationService.setStatus(verificationId, 'in_progress').catch(() => {})
    }
  }

  async function deleteVerification(id: string): Promise<void> {
    await verificationService.remove(id)
    verifications.value = verifications.value.filter((verification) => verification.id !== id)
    if (currentVerification.value?.id === id) currentVerification.value = null
  }

  async function addEvidence(evidence: VerificationEvidence): Promise<void> {
    const list = evidenceByItem.value[evidence.itemId] ?? []
    evidenceByItem.value = { ...evidenceByItem.value, [evidence.itemId]: [...list, evidence] }
    localDraftService.saveEvidence(evidence.verificationId, evidence)
    verificationService.saveEvidence(evidence).catch(() => {})
    void maybeTriggerCoreVisionAnalysis(evidence.itemId)
  }

  // 2026-09 split — the original single Core Vision v2 route (one Gemini
  // call over left+right+rear+front-suspension+engine-bottom) is now 4
  // independent routes, one per photo group, so each fires as soon as ITS
  // OWN required photo(s) exist rather than waiting on all 5 (supersedes the
  // old Group A/B/C trigger lists, which covered removed items like
  // front-wheel/rear-wheel/engine-left/engine-right/exhaust, and
  // now-Optional-no-AI items like rear-suspension/front-brake/rear-brake/
  // triple-clamp/seat). Fired fire-and-forget from the one choke point every
  // photo capture already goes through (addEvidence). APR-transmission-chain
  // only ever gets evidence when hasExposedChainSprocket is true (the item
  // is filtered out of the flow entirely otherwise — see flatItems above),
  // so it's only added to the engine-bottom group's "must all be present"
  // check when applicable.
  const CORE_VISION_TRIGGER_GROUPS: Array<{
    itemIds: string[]
    conditionalItemId?: string
    trigger: (verificationId: string) => Promise<unknown>
  }> = [
    { itemIds: ['APR-left-side', 'APR-right-side'], trigger: analyzeCoreVisionSides },
    { itemIds: ['APR-rear'], trigger: analyzeCoreVisionRear },
    { itemIds: ['APR-front-suspension'], trigger: analyzeCoreVisionFrontSuspension },
    {
      itemIds: ['APR-engine-bottom'],
      conditionalItemId: 'APR-transmission-chain',
      trigger: analyzeCoreVisionEngineBottom,
    },
  ]

  function hasEvidence(itemId: string): boolean {
    return (evidenceByItem.value[itemId]?.length ?? 0) > 0
  }

  async function maybeTriggerCoreVisionAnalysis(changedItemId: string): Promise<void> {
    const verificationId = currentVerification.value?.id
    if (!verificationId) return

    for (const group of CORE_VISION_TRIGGER_GROUPS) {
      const requiredItemIds =
        group.conditionalItemId && hasExposedChainSprocket.value
          ? [...group.itemIds, group.conditionalItemId]
          : group.itemIds
      if (!requiredItemIds.includes(changedItemId)) continue
      if (!requiredItemIds.every(hasEvidence)) continue
      group
        .trigger(verificationId)
        .catch((error) => console.error('[AI analysis] core vision group trigger failed:', error))
    }

    // Dashboard OCR (Step 7) — single-photo, fires the instant it exists,
    // never waits for Core Vision (spec §9/§18).
    if (changedItemId === 'APR-dashboard') {
      analyzeOcrDashboard(verificationId).catch((error) =>
        console.error('[AI analysis] analyzeOcrDashboard trigger failed:', error),
      )
    }

    // Step 1 (歷史工單) — placeholder routing only, per spec §4 (no
    // Maintenance Document Prompt/Schema Frozen yet).
    if (changedItemId === 'PREP-01') {
      const latestEvidenceId = evidenceByItem.value['PREP-01']?.slice(-1)[0]?.id
      if (latestEvidenceId) {
        analyzeDocumentMaintenance(verificationId, latestEvidenceId).catch((error) =>
          console.error('[AI analysis] analyzeDocumentMaintenance trigger failed:', error),
        )
      }
    }
  }

  /** Manual recovery for whatever `failedRequiredAnalysis` surfaces — every
   * analyze route here only ever needs `verificationId` (evidence is
   * resolved server-side by itemId), so a generic re-trigger is safe to fire
   * from the Hub without re-deriving per-route arguments. Still fire-and-
   * forget UI-wise (no loading spinner state), but no longer silent: a
   * failure is logged instead of vanishing, and Cloud Functions now always
   * leave a 'failed' trace on analysisStatus regardless of where it failed
   * (see withAnalysisFailureTrace server-side), so the Hub's hint/retry row
   * will reflect the outcome via the live analysisStatus subscription. */
  async function retryAnalysis(
    key:
      | 'coreVisionSides'
      | 'coreVisionRear'
      | 'coreVisionFrontSuspension'
      | 'coreVisionEngineBottom'
      | 'dashboardOcr'
      | 'coldCheck'
      | 'engineSensorSession',
  ): Promise<void> {
    const verificationId = currentVerification.value?.id
    if (!verificationId) return
    try {
      if (key === 'coreVisionSides') await analyzeCoreVisionSides(verificationId)
      else if (key === 'coreVisionRear') await analyzeCoreVisionRear(verificationId)
      else if (key === 'coreVisionFrontSuspension')
        await analyzeCoreVisionFrontSuspension(verificationId)
      else if (key === 'coreVisionEngineBottom') await analyzeCoreVisionEngineBottom(verificationId)
      else if (key === 'dashboardOcr') await analyzeOcrDashboard(verificationId)
      else if (key === 'coldCheck') await analyzeColdEngineTouchCheck(verificationId)
      else if (key === 'engineSensorSession') await analyzeEngineSensorSessionV2(verificationId)
    } catch (error) {
      console.error(`[AI analysis] retry ${key} failed:`, error)
    }
  }

  /**
   * A real delete — Storage object + Firestore doc — not just hidden from
   * this session's in-memory list. Previously (`removeEvidenceLocally`) this
   * only ever touched local state, so a superseded retake's old photo/video
   * kept living in Firestore forever: invisible in the app itself (which
   * only ever reads local state), but still very much there for anything
   * reading Firestore directly — e.g. the admin evidence viewer showing 2-3
   * old retakes of the same item stacked up (found live 2026-09). Every
   * call site wants this real behavior: an explicit user delete should
   * actually delete, and a capture flow replacing an old photo with a new
   * one should leave exactly one behind, not one hidden plus N orphaned.
   */
  async function removeEvidence(itemId: string, evidenceId: string): Promise<void> {
    const list = (evidenceByItem.value[itemId] ?? []).filter(
      (evidence) => evidence.id !== evidenceId,
    )
    evidenceByItem.value = { ...evidenceByItem.value, [itemId]: list }
    const verificationId = currentVerification.value?.id
    if (verificationId) {
      localDraftService.removeEvidence(verificationId, evidenceId)
      await verificationService.deleteEvidence(verificationId, evidenceId).catch(() => {})
    }
  }

  /** For single-photo items: after a new capture lands, discard every OTHER
   * evidence doc already on file for that item — a retake replaces, it never
   * accumulates. Called with the just-added evidence's own id so it's never
   * the one discarded, regardless of call order. */
  async function discardOtherEvidence(itemId: string, keepEvidenceId: string): Promise<void> {
    const superseded = (evidenceByItem.value[itemId] ?? []).filter(
      (evidence) => evidence.id !== keepEvidenceId,
    )
    await Promise.all(superseded.map((evidence) => removeEvidence(itemId, evidence.id)))
  }

  /**
   * Advances past `fromIndex`, honoring that item's `branch` rule if its
   * saved answer matches one — e.g. ELEC-10 "電系是否有改裝" answered 沒有
   * jumps straight to ENG-01, skipping ELEC-11..13. Whatever sits between
   * `fromIndex` and the branch target gets auto-answered `not_applicable`
   * (only if not already answered — a user who free-jumped back and filled
   * one in manually keeps that answer) so overallProgress/missingRequiredItems
   * treat them as done-and-excluded rather than perpetually incomplete.
   * Plain +1 (or "flow finished") when there's no branch, or the saved
   * answer doesn't match any of the item's branch rules.
   */
  function resolveNextIndex(fromIndex: number): number {
    const items = flatItems.value
    const from = items[fromIndex]
    const fallback = fromIndex + 1
    if (!from) return fallback

    const answer = answers.value[from.item.id]
    const rule = from.item.branch?.find((candidate) => candidate.value === answer?.result)
    if (!rule) return fallback

    const targetIndex = items.findIndex((flat) => flat.item.id === rule.skipToItemId)
    if (targetIndex === -1 || targetIndex <= fromIndex) return fallback

    for (let i = fromIndex + 1; i < targetIndex; i++) {
      const skipped = items[i].item
      if (answers.value[skipped.id]) continue
      void saveAnswer(skipped.id, 'not_applicable')
    }
    return targetIndex
  }

  /** First unanswered item — used to resume a draft where the user left off (§35). */
  const resumeIndex = computed(() => {
    const items = flatItems.value
    const firstUnanswered = items.findIndex((flat) => !answers.value[flat.item.id])
    return firstUnanswered === -1 ? Math.max(items.length - 1, 0) : firstUnanswered
  })

  const sectionProgress = computed<SectionProgress[]>(() =>
    sections.value.map((section) => ({
      sectionId: section.id,
      title: section.title,
      done: section.items.filter((flatItem) => answers.value[flatItem.id]).length,
      total: section.items.length,
    })),
  )

  const overallProgress = computed(() => {
    const total = flatItems.value.length
    const done = flatItems.value.filter((flat) => answers.value[flat.item.id]).length
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
  })

  /**
   * User-facing completeness now reads as a tier, not a percentage — a raw
   * "87%" doesn't mean anything to a buyer (87% of WHAT counts as good?).
   * All Required items are always done by the time a verification can even
   * complete (see completeVerification's missingRequiredItems guard above),
   * so the only thing left to vary is how much of Phase 4's 其他主動揭露
   * (entirely Optional — see seller-verification.ts's phase4 grouping) the
   * seller chose to also fill in:
   * - basic: every Required item done, no Optional disclosure at all.
   * - detailed: some but not all Optional disclosure items answered.
   * - complete: every Optional disclosure item answered too.
   */
  const disclosureCompleteness = computed(() => {
    const optional = flatItems.value.filter((flat) => !flat.item.required)
    const filled = optional.filter((flat) => !!answers.value[flat.item.id]).length
    return { filled, total: optional.length }
  })
  const verificationTier = computed<'basic' | 'detailed' | 'complete'>(() => {
    const { filled, total } = disclosureCompleteness.value
    if (total === 0 || filled === 0) return 'basic'
    return filled < total ? 'detailed' : 'complete'
  })

  /**
   * A `type: 'form'` item's `*`-marked fields were previously cosmetic
   * only — any single keystroke in ANY field flipped the whole item to
   * "answered" via handleFormDataChange. That let a verification
   * complete/archive with its required fields still blank. An item now
   * counts as answered only once every formField it marks `required`
   * actually has a non-empty value. (No current item uses `type: 'form'`
   * — the 45-step checklist has none — this stays generic for whenever
   * one is added back.)
   */
  function isAnswerComplete(item: VerificationItem, answer?: VerificationAnswer): boolean {
    if (!answer) return false
    if (item.type !== 'form') return true
    const requiredKeys = (item.formFields ?? [])
      .filter((field) => field.required)
      .map((field) => field.key)
    return requiredKeys.every((key) => !!answer.formData?.[key]?.trim())
  }

  const missingRequiredItems = computed<MissingRequiredItem[]>(() =>
    flatItems.value
      .filter(
        (flat) => flat.item.required && !isAnswerComplete(flat.item, answers.value[flat.item.id]),
      )
      .map((flat) => ({
        itemId: flat.item.id,
        title: flat.item.title,
        sectionTitle: flat.section.title,
      })),
  )

  /** A required evidence *kind* (item.evidence[].required) counts as
   * satisfied once ANY captured evidence of that item has finished
   * uploading — 'none' (never captured) is folded into missingRequiredItems
   * already via isAnswerComplete for form items, but pure evidence-only
   * items (no form fields) only ever gate on this upload-status check. */
  function requiredEvidenceStatus(itemId: string): 'uploaded' | 'pending' | 'failed' | 'none' {
    const list = evidenceByItem.value[itemId] ?? []
    if (list.length === 0) return 'none'
    let sawFailed = false
    for (const evidence of list) {
      const queueStatus = uploadQueueStore.statusFor(evidence.id)
      if (queueStatus === 'uploaded' || (!queueStatus && evidence.remoteUrl)) return 'uploaded'
      if (queueStatus === 'failed') sawFailed = true
    }
    return sawFailed ? 'failed' : 'pending'
  }

  function itemsWithRequiredEvidence(): FlatVerificationItem[] {
    return flatItems.value.filter((flat) => (flat.item.evidence ?? []).some((req) => req.required))
  }

  /** Required evidence still mid-upload (compressing/uploading/pending) — the
   * "完成驗車"/"產生報告" gate shows "正在完成最後幾筆資料上傳" for these,
   * not a hard failure. */
  const pendingRequiredUploads = computed<MissingRequiredItem[]>(() =>
    itemsWithRequiredEvidence()
      .filter((flat) => requiredEvidenceStatus(flat.item.id) === 'pending')
      .map((flat) => ({
        itemId: flat.item.id,
        title: flat.item.title,
        sectionTitle: flat.section.title,
      })),
  )

  /** Required evidence whose background upload failed even after automatic
   * retries — surfaced with a manual retry action, distinct from "still
   * uploading". Optional evidence failing never appears here and never
   * blocks completion. */
  const failedRequiredUploads = computed<MissingRequiredItem[]>(() =>
    itemsWithRequiredEvidence()
      .filter((flat) => requiredEvidenceStatus(flat.item.id) === 'failed')
      .map((flat) => ({
        itemId: flat.item.id,
        title: flat.item.title,
        sectionTitle: flat.section.title,
      })),
  )

  /** Verification v2 §38 Final Report Gate — the background AI routes that
   * must have actually finished (not just been fired) before a report can be
   * generated: the 4 Core Vision groups (2026-09 split — see
   * core-vision-split.service.ts), Dashboard OCR, Cold Check, and the Engine
   * Sensor Session (audio+IMU). Keyed by the same route names each Cloud
   * Function stamps onto Verification.analysisStatus (see
   * analysis-status.service.ts server-side) — absence of a key here just
   * means "not triggered yet", which is already covered by
   * missingRequiredItems blocking completion first, so this only ever needs
   * to check for 'processing'/'failed'. */
  const REQUIRED_ANALYSIS_KEYS = [
    'coreVisionSides',
    'coreVisionRear',
    'coreVisionFrontSuspension',
    'coreVisionEngineBottom',
    'dashboardOcr',
    'coldCheck',
    'engineSensorSession',
  ]
  function analysisStatusFor(key: string): 'processing' | 'completed' | 'failed' | undefined {
    return currentVerification.value?.analysisStatus?.[key]?.status
  }
  const pendingRequiredAnalysis = computed(() =>
    REQUIRED_ANALYSIS_KEYS.filter((key) => analysisStatusFor(key) === 'processing'),
  )
  const failedRequiredAnalysis = computed(() =>
    REQUIRED_ANALYSIS_KEYS.filter((key) => analysisStatusFor(key) === 'failed'),
  )

  const canComplete = computed(
    () =>
      flowLoaded.value &&
      missingRequiredItems.value.length === 0 &&
      pendingRequiredUploads.value.length === 0 &&
      failedRequiredUploads.value.length === 0 &&
      pendingRequiredAnalysis.value.length === 0 &&
      failedRequiredAnalysis.value.length === 0,
  )

  /**
   * P0 fix: within a `lockedOrder` section (引擎狀況), "下一步" must be a
   * REAL gate — not just hidden step-chips — or a rider can blast through
   * every safety check with zero evidence. An item is advance-ready once it
   * has an answer AND every evidence requirement it marks `required: true`
   * has at least one capture on file. Non-locked sections stay fully free —
   * this only ever tightens the 引擎 flow.
   */
  function isItemAdvanceReady(flatItem: FlatVerificationItem): boolean {
    if (!flatItem.section.lockedOrder) return true
    const { item } = flatItem
    if (!answers.value[item.id]) return false

    // Step 39 (冷車狀態確認) must actually be reviewed by AI before the rider
    // can move on to engine startup — once Startup is recorded, the Trusted
    // Backend permanently refuses to (re)analyze cold state (see
    // cold-touch.service.ts's coldCheckWindowStillOpen), so letting "下一步"
    // enable the instant the placeholder answer/evidence exist — before the
    // fire-and-forget analyzeColdEngineTouchCheck call has actually finished
    // — is a race that can leave this item permanently unverified rather
    // than just delayed. `=== 'completed'` on purpose: `undefined` (not
    // triggered yet / still in flight) must block exactly like 'failed'.
    if (item.id === 'ENG-02' && analysisStatusFor('coldCheck') !== 'completed') return false

    const requiredEvidence = (item.evidence ?? []).filter((requirement) => requirement.required)
    if (requiredEvidence.length === 0) return true

    const captured = evidenceByItem.value[item.id] ?? []
    return requiredEvidence.every((requirement) => {
      // 'motion'-kind requirements (ENG-07/ENG-08, the only ones in any
      // lockedOrder section) are actually captured through
      // EngineInspectionFlow.vue, which writes real evidence as
      // `type: 'imu'` (see its ENGINE_SESSION_ITEM_IDS capture path) — NOT
      // 'manual'. Checking only 'manual' here (matching the older, now
      // effectively unreachable MotionEvidenceCapture.vue path for these two
      // items) permanently failed this check for every user, since the
      // captured evidence's type never actually matched — silently blocking
      // "下一步"/"繼續驗車" at the end of 引擎狀況 forever, even with every
      // item genuinely answered and evidenced. Reproduced live on a real
      // in-progress verification before this fix. Accepting either type
      // keeps MotionEvidenceCapture.vue's write shape valid too, in case it
      // ever becomes reachable again.
      if (requirement.kind === 'motion') {
        return captured.some((evidence) => evidence.type === 'imu' || evidence.type === 'manual')
      }
      return captured.some((evidence) => evidence.type === requirement.kind)
    })
  }

  return {
    verifications,
    currentVerification,
    loading,
    fetchByVehicle,
    fetchVerification,
    createVerification,
    completeVerification,
    deleteVerification,
    saveTransactionDecision,

    answers,
    evidenceByItem,
    flowLoaded,
    flowKind,
    flatItems,
    sections,
    loadFlow,
    saveAnswer,
    addEvidence,
    removeEvidence,
    discardOtherEvidence,
    resolveNextIndex,
    resumeIndex,
    sectionProgress,
    overallProgress,
    disclosureCompleteness,
    verificationTier,
    missingRequiredItems,
    pendingRequiredUploads,
    failedRequiredUploads,
    hasExposedChainSprocket,
    pendingRequiredAnalysis,
    failedRequiredAnalysis,
    retryAnalysis,
    canComplete,
    isItemAdvanceReady,
  }
})
