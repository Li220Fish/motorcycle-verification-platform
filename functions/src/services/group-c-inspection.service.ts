import { GEMINI_MODEL } from '../config'
import {
  GLOBAL_INSPECTION_PROMPT,
  GLOBAL_INSPECTION_PROMPT_VERSION,
} from '../ai/prompts/global-inspection-v1'
import { RETRY_BASE_PROMPT } from '../ai/prompts/retry-base-v1'
import {
  GROUP_C_ITEM_IDS,
  GROUP_C_PROMPT,
  GROUP_C_PROMPT_VERSION,
} from '../ai/prompts/groups/engine-powertrain-v1'
import { GROUP_C_RETRY_PROMPTS } from '../ai/prompts/retry/group-c-retry'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { VisionInspectionProvider } from '../ai/providers/vision-inspection-provider'
import { resolveImageEvidenceForViews, resolveRetryImageEvidence } from './evidence.service'
import { GROUP_C_ITEM_EVIDENCE_VIEWS } from './item-evidence-map'
import { buildImageRequestContext } from './request-context'
import {
  assertRetryEligible,
  getAnswer,
  writeAiAnswer,
  writeSystemNotApplicable,
} from './answer-writer.service'
import { resolveVehicleContext } from './vehicle-context.service'

const CHAIN_SPROCKET_ITEM_ID = 'chain_sprocket_condition'

export async function analyzeGroupC(params: {
  verificationId: string
  vehicleId: string
  apiKey: string
  provider: VisionInspectionProvider
}): Promise<GeminiItemResult[]> {
  const vehicleContext = await resolveVehicleContext(params.vehicleId)

  // Backend decides chain_sprocket applicability BEFORE calling Gemini — no
  // point sending an irrelevant photo or asking the model to guess (Group C
  // spec §23: "推薦 Backend 直接決定").
  const requestedItemIds = vehicleContext.hasExposedChainSprocket
    ? [...GROUP_C_ITEM_IDS]
    : GROUP_C_ITEM_IDS.filter((itemId) => itemId !== CHAIN_SPROCKET_ITEM_ID)
  const requiredViews = vehicleContext.hasExposedChainSprocket
    ? ['engine_left', 'engine_right', 'engine_bottom', 'chain_sprocket', 'exhaust']
    : ['engine_left', 'engine_right', 'engine_bottom', 'exhaust']

  const images = await resolveImageEvidenceForViews(params.verificationId, requiredViews)
  const vehicleContextLines = [
    `hasExposedChainSprocket = ${vehicleContext.hasExposedChainSprocket}`,
    `powerType = gasoline`,
  ]
  const contextText = buildImageRequestContext({
    group: 'engine_powertrain',
    attempt: 1,
    images,
    requestedItemIds,
    vehicleContextLines,
  })
  const promptText = `${GLOBAL_INSPECTION_PROMPT}\n\n${GROUP_C_PROMPT}\n\n${contextText}`

  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    promptVersion: GROUP_C_PROMPT_VERSION,
    images,
    requestedItemIds,
  })

  validateGeminiResults(results, {
    requestedItemIds,
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
        group: GROUP_C_PROMPT_VERSION,
        retry: null,
      },
      attempt: 1,
    })
  }

  if (!vehicleContext.hasExposedChainSprocket) {
    await writeSystemNotApplicable(
      params.verificationId,
      CHAIN_SPROCKET_ITEM_ID,
      '此車輛沒有本項目可檢查的外露鏈條與齒盤，因此本項目不適用。',
      'vehicle-context-v1',
    )
  }

  return results
}

export async function retryGroupCItem(params: {
  verificationId: string
  apiKey: string
  itemId: string
  newEvidenceId: string
  provider: VisionInspectionProvider
}): Promise<GeminiItemResult> {
  const retry = GROUP_C_RETRY_PROMPTS[params.itemId]
  const views = GROUP_C_ITEM_EVIDENCE_VIEWS[params.itemId]
  if (!retry || !views) {
    throw new Error(`Unknown Group C itemId for retry: ${params.itemId}`)
  }

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
      group: GROUP_C_PROMPT_VERSION,
      retry: retry.version,
    },
    attempt: 2,
    existing,
  })
  return results[0]
}
