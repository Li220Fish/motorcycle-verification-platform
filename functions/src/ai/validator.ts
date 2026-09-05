import { GeminiItemResult, InvalidAiResponseError, RESULT_VALUES } from './schemas/common'

export interface ValidateOptions {
  requestedItemIds: string[]
  attempt: 1 | 2
  /** Evidence ids that were actually supplied in THIS request — an AI
   *  response citing anything outside this set (e.g. another verification's
   *  evidence) is rejected outright, never silently accepted. */
  validEvidenceIds: Set<string>
}

/**
 * Shared response validator for Group A/B/C (and reusable for Audio) — every
 * spec file lists the same rejection rules almost verbatim. Centralizing
 * this once avoids three slightly-different copies drifting apart.
 */
export function validateGeminiResults(
  results: GeminiItemResult[],
  { requestedItemIds, attempt, validEvidenceIds }: ValidateOptions,
): void {
  if (!Array.isArray(results)) {
    throw new InvalidAiResponseError('results must be an array')
  }

  const requested = new Set(requestedItemIds)
  const seen = new Set<string>()

  for (const item of results) {
    if (!requested.has(item.itemId)) {
      throw new InvalidAiResponseError(`Unknown itemId in response: ${item.itemId}`)
    }
    if (seen.has(item.itemId)) {
      throw new InvalidAiResponseError(`Duplicate itemId in response: ${item.itemId}`)
    }
    seen.add(item.itemId)

    // `cannot_check` is a retired value merged into `unsure` — reject it
    // outright rather than silently coercing it, so a stale prompt/model
    // regression is visible instead of masked.
    if (!RESULT_VALUES.includes(item.result)) {
      throw new InvalidAiResponseError(
        `Invalid result enum "${item.result}" for item ${item.itemId}`,
      )
    }

    if (item.result !== 'normal' && !item.note?.trim()) {
      throw new InvalidAiResponseError(`Non-normal result requires a note: ${item.itemId}`)
    }

    if (item.result === 'unsure') {
      if (attempt === 1 && !item.retakeInstruction?.trim()) {
        throw new InvalidAiResponseError(
          `attempt 1 unsure result requires retakeInstruction: ${item.itemId}`,
        )
      }
      if (attempt === 2 && item.retakeInstruction) {
        throw new InvalidAiResponseError(
          `attempt 2 (final) must not include retakeInstruction: ${item.itemId}`,
        )
      }
    }

    for (const evidenceId of item.evidenceIds ?? []) {
      if (!validEvidenceIds.has(evidenceId)) {
        throw new InvalidAiResponseError(
          `evidenceId "${evidenceId}" on item ${item.itemId} is not part of this request`,
        )
      }
    }
    for (const evidenceId of item.problematicEvidenceIds ?? []) {
      if (!validEvidenceIds.has(evidenceId)) {
        throw new InvalidAiResponseError(
          `problematicEvidenceId "${evidenceId}" on item ${item.itemId} is not part of this request`,
        )
      }
    }
  }

  for (const itemId of requestedItemIds) {
    if (!seen.has(itemId)) {
      throw new InvalidAiResponseError(`Missing result for requested item: ${itemId}`)
    }
  }
}
