import { GEMINI_MODEL } from '../config'
import {
  GLOBAL_INSPECTION_PROMPT,
  GLOBAL_INSPECTION_PROMPT_VERSION,
} from '../ai/prompts/global-inspection-v1'
import { RETRY_BASE_PROMPT } from '../ai/prompts/retry-base-v1'
import {
  GROUP_B_EVIDENCE_VIEWS,
  GROUP_B_ITEM_IDS,
  GROUP_B_PROMPT,
  GROUP_B_PROMPT_VERSION,
} from '../ai/prompts/groups/chassis-v1'
import { groupBRetryFor } from '../ai/prompts/retry/group-b-retry'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { VisionInspectionProvider } from '../ai/providers/vision-inspection-provider'
import { resolveImageEvidenceForViews, resolveRetryImageEvidence } from './evidence.service'
import { GROUP_B_ITEM_EVIDENCE_VIEWS } from './item-evidence-map'
import { buildImageRequestContext } from './request-context'
import { assertRetryEligible, getAnswer, writeAiAnswer } from './answer-writer.service'

export async function analyzeGroupB(params: {
  verificationId: string
  apiKey: string
  provider: VisionInspectionProvider
}): Promise<GeminiItemResult[]> {
  const images = await resolveImageEvidenceForViews(params.verificationId, GROUP_B_EVIDENCE_VIEWS)
  const contextText = buildImageRequestContext({
    group: 'chassis',
    attempt: 1,
    images,
    requestedItemIds: [...GROUP_B_ITEM_IDS],
  })
  const promptText = `${GLOBAL_INSPECTION_PROMPT}\n\n${GROUP_B_PROMPT}\n\n${contextText}`

  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    promptVersion: GROUP_B_PROMPT_VERSION,
    images,
    requestedItemIds: [...GROUP_B_ITEM_IDS],
  })

  validateGeminiResults(results, {
    requestedItemIds: [...GROUP_B_ITEM_IDS],
    attempt: 1,
    validEvidenceIds: new Set(images.map((image) => image.evidenceId)),
  })

  for (const item of results) {
    await writeAiAnswer({
      verificationId: params.verificationId,
      item,
      modelId: GEMINI_MODEL,
      modelVersion: GEMINI_MODEL,
      analysisType: 'vision',
      promptVersion: {
        global: GLOBAL_INSPECTION_PROMPT_VERSION,
        group: GROUP_B_PROMPT_VERSION,
        retry: null,
      },
      attempt: 1,
    })
  }
  return results
}

export async function retryGroupBItem(params: {
  verificationId: string
  apiKey: string
  itemId: string
  newEvidenceId: string
  provider: VisionInspectionProvider
}): Promise<GeminiItemResult> {
  const views = GROUP_B_ITEM_EVIDENCE_VIEWS[params.itemId]
  if (!views) {
    throw new Error(`Unknown Group B itemId for retry: ${params.itemId}`)
  }
  const retry = groupBRetryFor(params.itemId)

  const existing = await getAnswer(params.verificationId, params.itemId)
  assertRetryEligible(existing)

  const images = await resolveRetryImageEvidence(params.verificationId, params.newEvidenceId, views)
  const promptText = `${GLOBAL_INSPECTION_PROMPT}\n\n${RETRY_BASE_PROMPT}\n\n${retry.prompt}`

  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    promptVersion: retry.version,
    images,
    requestedItemIds: [params.itemId],
  })

  validateGeminiResults(results, {
    requestedItemIds: [params.itemId],
    attempt: 2,
    validEvidenceIds: new Set(images.map((image) => image.evidenceId)),
  })

  await writeAiAnswer({
    verificationId: params.verificationId,
    item: results[0],
    modelId: GEMINI_MODEL,
    modelVersion: GEMINI_MODEL,
    analysisType: 'vision',
    promptVersion: {
      global: GLOBAL_INSPECTION_PROMPT_VERSION,
      group: GROUP_B_PROMPT_VERSION,
      retry: retry.version,
    },
    attempt: 2,
    existing,
  })
  return results[0]
}
