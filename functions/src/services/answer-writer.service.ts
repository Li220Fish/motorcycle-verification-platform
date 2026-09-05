import { getFirestore } from 'firebase-admin/firestore'
import {
  AiAttempt,
  AiResultDoc,
  GeminiItemResult,
  PromptVersion,
  ResultValue,
} from '../ai/schemas/common'

export interface ExistingAnswer {
  itemId: string
  result: ResultValue
  note?: string
  aiResult?: AiResultDoc
}

export async function getAnswer(
  verificationId: string,
  itemId: string,
): Promise<ExistingAnswer | null> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('answers')
    .doc(itemId)
    .get()
  return snap.exists ? (snap.data() as ExistingAnswer) : null
}

/** Every Group spec's Retry API Contract: only `result == unsure` at
 *  `finalAttempt == 1` may retry; a 3rd attempt is rejected outright. */
export function assertRetryEligible(existing: ExistingAnswer | null): void {
  if (!existing || existing.result !== 'unsure') {
    throw new Error('Retry is only allowed while the current result is unsure.')
  }
  const finalAttempt = existing.aiResult?.details.finalAttempt ?? 1
  if (finalAttempt >= 2) {
    throw new Error('Maximum retry attempts (2) already used for this item.')
  }
}

/** Writes one AI-managed Answer — `note` (the User's own field) is
 *  deliberately never touched here (merge:true + omitted key), matching
 *  every spec's "User.note is isolated, AI never writes it" rule. */
export async function writeAiAnswer(params: {
  verificationId: string
  item: GeminiItemResult
  modelId: string
  modelVersion: string
  analysisType: 'vision' | 'audio' | 'imu'
  promptVersion: PromptVersion
  attempt: 1 | 2
  existing?: ExistingAnswer | null
}): Promise<void> {
  const {
    verificationId,
    item,
    modelId,
    modelVersion,
    analysisType,
    promptVersion,
    attempt,
    existing,
  } = params

  const attempts: AiAttempt[] =
    attempt === 2 && existing?.aiResult
      ? [
          ...existing.aiResult.details.attempts,
          {
            attempt: existing.aiResult.details.finalAttempt,
            result: existing.result,
            confidence: existing.aiResult.confidence,
            label: existing.aiResult.label,
            note: existing.aiResult.details.note,
            evidenceIds: existing.aiResult.details.evidenceIds,
          },
        ]
      : []

  // Group A's own Gemini schema never asks for a `details` sub-object at all
  // (only Group B/C's does, for findings/regions/etc — see each spec's
  // Structured Output section), so `item.details` is routinely undefined.
  // Firestore's Admin SDK rejects `undefined` anywhere in a written document
  // outright — build this object with only the keys that actually have a
  // defined value, the same discipline the client's own
  // verificationService already follows (stripUndefined).
  const details = (item.details ?? {}) as Record<string, unknown>
  const aiResultDetails: AiResultDoc['details'] = {
    note: item.note,
    analysisType,
    evidenceIds: item.evidenceIds,
    promptVersion,
    attempts,
    finalAttempt: attempt,
  }
  if (details.findings !== undefined) aiResultDetails.findings = details.findings as string[]
  if (details.regions !== undefined) aiResultDetails.regions = details.regions as string[]
  if (details.balanceWeightVisible !== undefined) {
    aiResultDetails.balanceWeightVisible = details.balanceWeightVisible as boolean | null
  }
  if (details.brakeTypeVisible !== undefined) {
    aiResultDetails.brakeTypeVisible = details.brakeTypeVisible as 'disc' | 'drum' | 'uncertain'
  }
  if (details.contactVisible !== undefined) {
    aiResultDetails.contactVisible = details.contactVisible as boolean
  }
  if (details.contactMaintainedFullWindow !== undefined) {
    aiResultDetails.contactMaintainedFullWindow = details.contactMaintainedFullWindow as boolean
  }
  if (details.targetAreaVisible !== undefined) {
    aiResultDetails.targetAreaVisible = details.targetAreaVisible as boolean
  }
  if (details.coldStateValid !== undefined) {
    aiResultDetails.coldStateValid = details.coldStateValid as boolean
  }

  const aiResult: AiResultDoc = {
    model: modelId,
    modelVersion,
    confidence: item.confidence,
    label: item.label,
    details: aiResultDetails,
  }

  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('answers')
    .doc(item.itemId)
    .set(
      { itemId: item.itemId, result: item.result, aiResult, updatedAt: Date.now() },
      { merge: true },
    )
}

/** Backend-decided `not_applicable` with zero Gemini cost — e.g.
 *  chain_sprocket_condition on a vehicle with no exposed chain (Group C
 *  spec §23: "推薦 Backend 直接決定... 這比送無關照片給模型更省"). */
export async function writeSystemNotApplicable(
  verificationId: string,
  itemId: string,
  note: string,
  modelVersion: string,
): Promise<void> {
  const aiResult: AiResultDoc = {
    model: 'motoverify-backend-rules',
    modelVersion,
    confidence: null,
    label: 'not_applicable_by_vehicle_context',
    details: { note, analysisType: 'vision', evidenceIds: [], attempts: [], finalAttempt: 1 },
  }
  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('answers')
    .doc(itemId)
    .set({ itemId, result: 'not_applicable', aiResult, updatedAt: Date.now() }, { merge: true })
}
