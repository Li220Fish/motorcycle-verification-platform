import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getFlatItems, getFlowSections } from '@/data/verification'
import type { FlatVerificationItem, VerificationSection } from '@/data/verification'
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
    cannotCheckReason?: string,
    formData?: Record<string, string>,
  ): Promise<void> {
    if (!currentVerification.value) return
    const verificationId = currentVerification.value.id
    const answer: VerificationAnswer = {
      itemId,
      result,
      note,
      cannotCheckReason,
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

  async function addEvidence(evidence: VerificationEvidence): Promise<void> {
    const list = evidenceByItem.value[evidence.itemId] ?? []
    evidenceByItem.value = { ...evidenceByItem.value, [evidence.itemId]: [...list, evidence] }
    localDraftService.saveEvidence(evidence.verificationId, evidence)
    verificationService.saveEvidence(evidence).catch(() => {})
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

  const missingRequiredItems = computed<MissingRequiredItem[]>(() =>
    flatItems.value
      .filter((flat) => flat.item.required && !answers.value[flat.item.id])
      .map((flat) => ({
        itemId: flat.item.id,
        title: flat.item.title,
        sectionTitle: flat.section.title,
      })),
  )

  const canComplete = computed(() => flowLoaded.value && missingRequiredItems.value.length === 0)

  return {
    verifications,
    currentVerification,
    loading,
    fetchByVehicle,
    fetchVerification,
    createVerification,
    completeVerification,
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
    resumeIndex,
    sectionProgress,
    overallProgress,
    missingRequiredItems,
    canComplete,
  }
})
