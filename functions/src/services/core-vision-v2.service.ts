import { GEMINI_MODEL } from '../config'
import { GLOBAL_INSPECTION_PROMPT_VERSION } from '../ai/prompts/global-inspection-v2'
import {
  CORE_VISION_V2_EVIDENCE_VIEWS,
  CORE_VISION_V2_ITEM_IDS,
  CORE_VISION_V2_PROMPT_VERSION,
} from '../ai/prompts/core-vision-v2'
import { CORE_VISION_V2_RETRY_PROMPTS } from '../ai/prompts/retry/core-vision-v2-retry'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { VisionInspectionProvider } from '../ai/providers/vision-inspection-provider'
import { resolveImageEvidenceForViews, resolveRetryImageEvidence } from './evidence.service'
import { CORE_VISION_V2_ITEM_EVIDENCE_VIEWS } from './item-evidence-map'
import { buildImageRequestContext } from './request-context'
import {
  assertRetryEligible,
  getAnswer,
  writeAiAnswer,
  writeSystemNotApplicable,
} from './answer-writer.service'
import { resolveVehicleContext } from './vehicle-context.service'
import { withAnalysisStatus } from './analysis-status.service'
import { hashPromptText, resolvePromptText } from './prompt-config.service'

const CHAIN_SPROCKET_ITEM_ID = 'chain_sprocket_condition'

/**
 * Verification v2 migration — supersedes analyzeGroupA/B/C
 * (group-a/b/c-inspection.service.ts, deleted). Consolidates the surviving
 * items from all three retired groups into ONE route over the reduced Core
 * Vision evidence set. `chain_sprocket_condition` keeps the exact same
 * backend-decided, zero-Gemini-cost `not_applicable` path Group C had
 * (spec §16/§23 unchanged — only moved here).
 */
export async function analyzeCoreVisionV2(params: {
  verificationId: string
  vehicleId: string
  apiKey: string
  provider: VisionInspectionProvider
}): Promise<GeminiItemResult[]> {
  return withAnalysisStatus(params.verificationId, 'coreVision', async () => {
    const vehicleContext = await resolveVehicleContext(params.vehicleId)

    const requestedItemIds = vehicleContext.hasExposedChainSprocket
      ? [...CORE_VISION_V2_ITEM_IDS]
      : CORE_VISION_V2_ITEM_IDS.filter((itemId) => itemId !== CHAIN_SPROCKET_ITEM_ID)
    const requiredViews = vehicleContext.hasExposedChainSprocket
      ? [...CORE_VISION_V2_EVIDENCE_VIEWS, 'chain_sprocket']
      : [...CORE_VISION_V2_EVIDENCE_VIEWS]

    const images = await resolveImageEvidenceForViews(params.verificationId, requiredViews)
    const vehicleContextLines = [
      `hasExposedChainSprocket = ${vehicleContext.hasExposedChainSprocket}`,
      `powerType = gasoline`,
    ]
    const contextText = buildImageRequestContext({
      group: 'core_vision_v2',
      attempt: 1,
      images,
      requestedItemIds,
      vehicleContextLines,
    })
    const [globalPrompt, coreVisionPrompt] = await Promise.all([
      resolvePromptText('global-inspection-v2'),
      resolvePromptText('core-vision-v2'),
    ])
    const promptText = `${globalPrompt}\n\n${coreVisionPrompt}\n\n${contextText}`

    const results = await params.provider.analyze({
      apiKey: params.apiKey,
      promptText,
      // Hash-suffixed only for THIS call's Gemini response cache key — an
      // admin editing this prompt's text must bust the cache even though
      // CORE_VISION_V2_PROMPT_VERSION (a stable route name) doesn't change.
      // The clean version string below is still what gets recorded on the
      // Answer for provenance.
      promptVersion: `${CORE_VISION_V2_PROMPT_VERSION}:${hashPromptText(promptText)}`,
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
          group: CORE_VISION_V2_PROMPT_VERSION,
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
  })
}

export async function retryCoreVisionV2Item(params: {
  verificationId: string
  apiKey: string
  itemId: string
  newEvidenceId: string
  provider: VisionInspectionProvider
}): Promise<GeminiItemResult> {
  const retry = CORE_VISION_V2_RETRY_PROMPTS[params.itemId]
  const views = CORE_VISION_V2_ITEM_EVIDENCE_VIEWS[params.itemId]
  if (!retry || !views) {
    throw new Error(`Unknown Core Vision v2 itemId for retry: ${params.itemId}`)
  }

  const existing = await getAnswer(params.verificationId, params.itemId)
  assertRetryEligible(existing)

  const images = await resolveRetryImageEvidence(params.verificationId, params.newEvidenceId, views)
  const [globalPrompt, retryBasePrompt, retryItemPrompt] = await Promise.all([
    resolvePromptText('global-inspection-v2'),
    resolvePromptText('retry-base-v1'),
    resolvePromptText(`core-vision-v2-retry-${params.itemId}`),
  ])
  const promptText = `${globalPrompt}\n\n${retryBasePrompt}\n\n${retryItemPrompt}`

  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    // See analyzeCoreVisionV2 above for why this is hash-suffixed.
    promptVersion: `${retry.version}:${hashPromptText(promptText)}`,
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
      group: CORE_VISION_V2_PROMPT_VERSION,
      retry: retry.version,
    },
    attempt: 2,
    existing,
  })
  return results[0]
}
