import type { VerificationAnswer, VerificationEvidence } from '@/types/verification-evidence'

/**
 * Local-first cache for in-progress verification answers/evidence. Every
 * write lands here synchronously before the Firestore write is attempted,
 * so a dropped connection on-site never loses an answer — see V0.2 spec
 * §36–§37. This is intentionally simple (localStorage, last-write-wins by
 * `updatedAt`), not a full offline sync engine.
 */

function answersKey(verificationId: string): string {
  return `motoverify:verification:${verificationId}:answers`
}

function evidenceKey(verificationId: string): string {
  return `motoverify:verification:${verificationId}:evidence`
}

function lastPositionKey(verificationId: string): string {
  return `motoverify:verification:${verificationId}:lastPosition`
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeJson<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable/full — evidence/answers still hold in memory for this session
  }
}

function loadAnswers(verificationId: string): VerificationAnswer[] {
  return readJson<VerificationAnswer>(answersKey(verificationId))
}

function saveAnswer(verificationId: string, answer: VerificationAnswer): void {
  const answers = loadAnswers(verificationId).filter(
    (existing) => existing.itemId !== answer.itemId,
  )
  answers.push(answer)
  writeJson(answersKey(verificationId), answers)
}

function loadEvidence(verificationId: string): VerificationEvidence[] {
  return readJson<VerificationEvidence>(evidenceKey(verificationId))
}

function saveEvidence(verificationId: string, evidence: VerificationEvidence): void {
  const list = loadEvidence(verificationId).filter((existing) => existing.id !== evidence.id)
  list.push(evidence)
  writeJson(evidenceKey(verificationId), list)
}

function removeEvidence(verificationId: string, evidenceId: string): void {
  const list = loadEvidence(verificationId).filter((existing) => existing.id !== evidenceId)
  writeJson(evidenceKey(verificationId), list)
}

/**
 * Where the user was last looking at this verification — distinct from
 * "first unanswered item" (see verification.store.ts `resumeIndex`). A
 * reload should restore the exact item the user left off on, not silently
 * yank them back to 事前準備 #1 because they were free-jumping around 車輛檢查.
 */
function loadLastPosition(verificationId: string): string | null {
  try {
    return localStorage.getItem(lastPositionKey(verificationId))
  } catch {
    return null
  }
}

function saveLastPosition(verificationId: string, itemId: string): void {
  try {
    localStorage.setItem(lastPositionKey(verificationId), itemId)
  } catch {
    // best-effort only
  }
}

export const localDraftService = {
  loadAnswers,
  saveAnswer,
  loadEvidence,
  saveEvidence,
  removeEvidence,
  loadLastPosition,
  saveLastPosition,
}
