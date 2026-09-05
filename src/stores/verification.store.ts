import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getFlatItems, getFlowSections } from '@/data/verification'
import type {
  FlatVerificationItem,
  VerificationItem,
  VerificationSection,
} from '@/data/verification'
import {
  analyzeDocumentMaintenance,
  analyzeInspectionGroupA,
  analyzeInspectionGroupB,
  analyzeInspectionGroupC,
  analyzeOcrChassis,
  analyzeOcrDashboard,
  analyzeOcrPlate,
} from '@/services/firebase/ai-analysis.service'
import { verificationService } from '@/services/firebase/verification.service'
import { localDraftService } from '@/services/verification/local-draft.service'
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
  const verifications = ref<Verification[]>([])
  const currentVerification = ref<Verification | null>(null)
  const loading = ref(false)

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
  const flatItems = computed<FlatVerificationItem[]>(() =>
    currentVerification.value ? getFlatItems(flowKind.value) : [],
  )
  const sections = computed<VerificationSection[]>(() =>
    currentVerification.value ? getFlowSections(flowKind.value) : [],
  )

  /** Loads the verification + hydrates answers/evidence (Firestore, then local-draft overrides by recency). */
  async function loadFlow(verificationId: string): Promise<void> {
    loading.value = true
    flowLoaded.value = false
    try {
      currentVerification.value = await verificationService.get(verificationId)
      if (!currentVerification.value) return

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
  ): Promise<void> {
    if (!currentVerification.value) return
    const verificationId = currentVerification.value.id
    const answer: VerificationAnswer = {
      itemId,
      result,
      note,
      formData,
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
    void maybeTriggerGroupAnalysis(evidence.itemId)
  }

  // Group A/B/C Evidence Views (Routing Map §9/§13/§15 trigger conditions —
  // "只有全部所需 Evidence Ready 才 call") — expressed here in this
  // project's OWN photo-slot itemIds (APR-*), not the routing map's view
  // names, since that's what evidenceByItem is actually keyed by. Fired
  // fire-and-forget from the one choke point every photo capture already
  // goes through (addEvidence), rather than scattered across UI components.
  const GROUP_A_TRIGGER_ITEM_IDS = ['APR-left-side', 'APR-right-side', 'APR-rear', 'APR-seat']
  const GROUP_B_TRIGGER_ITEM_IDS = [
    'APR-front-wheel',
    'APR-rear-wheel',
    'APR-front-suspension',
    'APR-rear-suspension',
    'APR-front-brake',
    'APR-rear-brake',
    'APR-triple-clamp',
  ]
  // Always includes APR-transmission-chain — the 45-step checklist requires
  // this photo from every vehicle regardless of type (unchanged this pass),
  // so evidence for it always exists; the Backend alone decides whether a
  // scooter's photo is actually used or the item comes back not_applicable
  // (Group C spec §16/§23), never the client.
  const GROUP_C_TRIGGER_ITEM_IDS = [
    'APR-engine-left',
    'APR-engine-right',
    'APR-engine-bottom',
    'APR-transmission-chain',
    'APR-exhaust',
  ]

  function hasEvidence(itemId: string): boolean {
    return (evidenceByItem.value[itemId]?.length ?? 0) > 0
  }

  async function maybeTriggerGroupAnalysis(changedItemId: string): Promise<void> {
    const verificationId = currentVerification.value?.id
    if (!verificationId) return

    if (
      GROUP_A_TRIGGER_ITEM_IDS.includes(changedItemId) &&
      GROUP_A_TRIGGER_ITEM_IDS.every(hasEvidence)
    ) {
      analyzeInspectionGroupA(verificationId).catch(() => {})
    }
    if (
      GROUP_B_TRIGGER_ITEM_IDS.includes(changedItemId) &&
      GROUP_B_TRIGGER_ITEM_IDS.every(hasEvidence)
    ) {
      analyzeInspectionGroupB(verificationId).catch(() => {})
    }
    if (
      GROUP_C_TRIGGER_ITEM_IDS.includes(changedItemId) &&
      GROUP_C_TRIGGER_ITEM_IDS.every(hasEvidence)
    ) {
      analyzeInspectionGroupC(verificationId).catch(() => {})
    }

    // OCR routes (Routing Map §11/§12/§21) — single-photo groups, fire the
    // instant that one photo exists.
    if (changedItemId === 'APR-dashboard') analyzeOcrDashboard(verificationId).catch(() => {})
    if (changedItemId === 'APR-plate') analyzeOcrPlate(verificationId).catch(() => {})
    if (changedItemId === 'APR-vin') analyzeOcrChassis(verificationId).catch(() => {})

    // Step 1 (歷史工單) — placeholder routing only, per spec §4/§71 (no
    // Maintenance Document Prompt/Schema Frozen yet).
    if (changedItemId === 'PREP-01') {
      const latestEvidenceId = evidenceByItem.value['PREP-01']?.slice(-1)[0]?.id
      if (latestEvidenceId) {
        analyzeDocumentMaintenance(verificationId, latestEvidenceId).catch(() => {})
      }
    }
  }

  function removeEvidenceLocally(itemId: string, evidenceId: string): void {
    const list = (evidenceByItem.value[itemId] ?? []).filter(
      (evidence) => evidence.id !== evidenceId,
    )
    evidenceByItem.value = { ...evidenceByItem.value, [itemId]: list }
    if (currentVerification.value) {
      localDraftService.removeEvidence(currentVerification.value.id, evidenceId)
    }
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

  const canComplete = computed(() => flowLoaded.value && missingRequiredItems.value.length === 0)

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
    removeEvidenceLocally,
    resolveNextIndex,
    resumeIndex,
    sectionProgress,
    overallProgress,
    missingRequiredItems,
    canComplete,
    isItemAdvanceReady,
  }
})
