import { GEMINI_MODEL } from '../config'
import { GLOBAL_INSPECTION_PROMPT_VERSION } from '../ai/prompts/global-inspection-v2'
import {
  CORE_VISION_SIDES_V1_EVIDENCE_VIEWS,
  CORE_VISION_SIDES_V1_ITEM_IDS,
  CORE_VISION_SIDES_V1_PROMPT_VERSION,
} from '../ai/prompts/core-vision-sides-v1'
import {
  CORE_VISION_REAR_V1_EVIDENCE_VIEWS,
  CORE_VISION_REAR_V1_ITEM_IDS,
  CORE_VISION_REAR_V1_PROMPT_VERSION,
} from '../ai/prompts/core-vision-rear-v1'
import {
  CORE_VISION_FRONT_SUSPENSION_V1_EVIDENCE_VIEWS,
  CORE_VISION_FRONT_SUSPENSION_V1_ITEM_IDS,
  CORE_VISION_FRONT_SUSPENSION_V1_PROMPT_VERSION,
} from '../ai/prompts/core-vision-front-suspension-v1'
import {
  CORE_VISION_ENGINE_BOTTOM_V1_EVIDENCE_VIEWS,
  CORE_VISION_ENGINE_BOTTOM_V1_ITEM_IDS,
  CORE_VISION_ENGINE_BOTTOM_V1_PROMPT_VERSION,
} from '../ai/prompts/core-vision-engine-bottom-v1'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { VisionInspectionProvider } from '../ai/providers/vision-inspection-provider'
import { resolveImageEvidenceForViews } from './evidence.service'
import { buildImageRequestContext, buildKnownIssuesBlock } from './request-context'
import { writeAiAnswer, writeSystemNotApplicable } from './answer-writer.service'
import { resolveKnownIssuesForPart, resolveVehicleContext } from './vehicle-context.service'
import { withAnalysisStatus } from './analysis-status.service'
import { hashPromptText, resolvePromptText } from './prompt-config.service'

const CHAIN_SPROCKET_ITEM_ID = 'chain_sprocket_condition'

interface CoreVisionCallParams {
  verificationId: string
  /** 車輛選單資訊（vehicleModels/{id}）通病清單依此解析 — see
   * resolveKnownIssuesForPart. Every route needs this now, not just
   * engine-bottom, since every route injects its own part's known issues. */
  vehicleId: string
  apiKey: string
  provider: VisionInspectionProvider
}

async function writeResults(
  verificationId: string,
  results: GeminiItemResult[],
  groupPromptVersion: string,
): Promise<void> {
  for (const item of results) {
    await writeAiAnswer({
      verificationId,
      item,
      modelId: GEMINI_MODEL,
      modelVersion: GEMINI_MODEL,
      analysisType: 'vision',
      promptVersion: {
        global: GLOBAL_INSPECTION_PROMPT_VERSION,
        group: groupPromptVersion,
        retry: null,
      },
      attempt: 1,
    })
  }
}

/**
 * Verification v2 migration (2026-09) — splits the original single
 * core-vision-v2 call (core-vision-v2.service.ts, deleted) into 4
 * independent routes, one per photo group (左＋右／車尾／前避震／引擎底
 * 部), so each group's Gemini call fires as soon as its own photo(s) exist
 * and each item's prompt criteria can be tuned independently. Trade-off: the
 * shared global-inspection-v2 prefix is now paid for once per group instead
 * of once total.
 *
 * 2026-09: each route also injects that specific part's 車輛選單資訊
 * (vehicleModels) known-common-issues list, if the vehicle is linked to a
 * catalog model with any issues tagged for it — see
 * resolveKnownIssuesForPart / buildKnownIssuesBlock. Framed explicitly as
 * "reference only, not a confirmed defect" so it nudges Gemini's attention
 * without overriding the "judge only from actual evidence" rule every
 * Group prompt already states.
 */
export async function analyzeCoreVisionSides(
  params: CoreVisionCallParams,
): Promise<GeminiItemResult[]> {
  return withAnalysisStatus(params.verificationId, 'coreVisionSides', async () => {
    const requestedItemIds = [...CORE_VISION_SIDES_V1_ITEM_IDS]
    const images = await resolveImageEvidenceForViews(
      params.verificationId,
      CORE_VISION_SIDES_V1_EVIDENCE_VIEWS,
    )
    const knownIssues = await resolveKnownIssuesForPart(params.vehicleId, 'sides')
    const contextText = buildImageRequestContext({
      group: 'core_vision_sides_v1',
      attempt: 1,
      images,
      requestedItemIds,
      knownIssuesLines: buildKnownIssuesBlock(knownIssues),
    })
    const [globalPrompt, groupPrompt] = await Promise.all([
      resolvePromptText('global-inspection-v2'),
      resolvePromptText('core-vision-sides-v1'),
    ])
    const promptText = `${globalPrompt}\n\n${groupPrompt}\n\n${contextText}`

    const results = await params.provider.analyze({
      apiKey: params.apiKey,
      promptText,
      promptVersion: `${CORE_VISION_SIDES_V1_PROMPT_VERSION}:${hashPromptText(promptText)}`,
      images,
      requestedItemIds,
    })

    validateGeminiResults(results, {
      requestedItemIds,
      attempt: 1,
      validEvidenceIds: new Set(images.map((image) => image.evidenceId)),
    })

    await writeResults(params.verificationId, results, CORE_VISION_SIDES_V1_PROMPT_VERSION)
    return results
  })
}

/** body_alignment_visual lives ONLY here — see core-vision-rear-v1.ts's own
 * doc comment for why symmetry judgment needs the rear photo specifically,
 * not the separate left/right side photos. */
export async function analyzeCoreVisionRear(
  params: CoreVisionCallParams,
): Promise<GeminiItemResult[]> {
  return withAnalysisStatus(params.verificationId, 'coreVisionRear', async () => {
    const requestedItemIds = [...CORE_VISION_REAR_V1_ITEM_IDS]
    const images = await resolveImageEvidenceForViews(
      params.verificationId,
      CORE_VISION_REAR_V1_EVIDENCE_VIEWS,
    )
    const knownIssues = await resolveKnownIssuesForPart(params.vehicleId, 'rear')
    const contextText = buildImageRequestContext({
      group: 'core_vision_rear_v1',
      attempt: 1,
      images,
      requestedItemIds,
      knownIssuesLines: buildKnownIssuesBlock(knownIssues),
    })
    const [globalPrompt, groupPrompt] = await Promise.all([
      resolvePromptText('global-inspection-v2'),
      resolvePromptText('core-vision-rear-v1'),
    ])
    const promptText = `${globalPrompt}\n\n${groupPrompt}\n\n${contextText}`

    const results = await params.provider.analyze({
      apiKey: params.apiKey,
      promptText,
      promptVersion: `${CORE_VISION_REAR_V1_PROMPT_VERSION}:${hashPromptText(promptText)}`,
      images,
      requestedItemIds,
    })

    validateGeminiResults(results, {
      requestedItemIds,
      attempt: 1,
      validEvidenceIds: new Set(images.map((image) => image.evidenceId)),
    })

    await writeResults(params.verificationId, results, CORE_VISION_REAR_V1_PROMPT_VERSION)
    return results
  })
}

export async function analyzeCoreVisionFrontSuspension(
  params: CoreVisionCallParams,
): Promise<GeminiItemResult[]> {
  return withAnalysisStatus(params.verificationId, 'coreVisionFrontSuspension', async () => {
    const requestedItemIds = [...CORE_VISION_FRONT_SUSPENSION_V1_ITEM_IDS]
    const images = await resolveImageEvidenceForViews(
      params.verificationId,
      CORE_VISION_FRONT_SUSPENSION_V1_EVIDENCE_VIEWS,
    )
    const knownIssues = await resolveKnownIssuesForPart(params.vehicleId, 'front_suspension')
    const contextText = buildImageRequestContext({
      group: 'core_vision_front_suspension_v1',
      attempt: 1,
      images,
      requestedItemIds,
      knownIssuesLines: buildKnownIssuesBlock(knownIssues),
    })
    const [globalPrompt, groupPrompt] = await Promise.all([
      resolvePromptText('global-inspection-v2'),
      resolvePromptText('core-vision-front-suspension-v1'),
    ])
    const promptText = `${globalPrompt}\n\n${groupPrompt}\n\n${contextText}`

    const results = await params.provider.analyze({
      apiKey: params.apiKey,
      promptText,
      promptVersion: `${CORE_VISION_FRONT_SUSPENSION_V1_PROMPT_VERSION}:${hashPromptText(promptText)}`,
      images,
      requestedItemIds,
    })

    validateGeminiResults(results, {
      requestedItemIds,
      attempt: 1,
      validEvidenceIds: new Set(images.map((image) => image.evidenceId)),
    })

    await writeResults(
      params.verificationId,
      results,
      CORE_VISION_FRONT_SUSPENSION_V1_PROMPT_VERSION,
    )
    return results
  })
}

/** chain_sprocket_condition keeps the exact same backend-decided,
 * zero-Gemini-cost `not_applicable` path it always had (see
 * vehicle-context.service.ts's hasExposedChainSprocket) — only moved here
 * from the old consolidated core-vision-v2.service.ts. `powerType` context
 * moved here too (rather than sent on every group like the old single call
 * did) since it's only ever relevant to reading an engine-bottom photo. */
export async function analyzeCoreVisionEngineBottom(
  params: CoreVisionCallParams,
): Promise<GeminiItemResult[]> {
  return withAnalysisStatus(params.verificationId, 'coreVisionEngineBottom', async () => {
    const vehicleContext = await resolveVehicleContext(params.vehicleId)
    const requestedItemIds = vehicleContext.hasExposedChainSprocket
      ? [...CORE_VISION_ENGINE_BOTTOM_V1_ITEM_IDS]
      : CORE_VISION_ENGINE_BOTTOM_V1_ITEM_IDS.filter((itemId) => itemId !== CHAIN_SPROCKET_ITEM_ID)
    const requiredViews = vehicleContext.hasExposedChainSprocket
      ? [...CORE_VISION_ENGINE_BOTTOM_V1_EVIDENCE_VIEWS, 'chain_sprocket']
      : [...CORE_VISION_ENGINE_BOTTOM_V1_EVIDENCE_VIEWS]

    const images = await resolveImageEvidenceForViews(params.verificationId, requiredViews)
    const knownIssues = await resolveKnownIssuesForPart(params.vehicleId, 'engine_bottom')
    const contextText = buildImageRequestContext({
      group: 'core_vision_engine_bottom_v1',
      attempt: 1,
      images,
      requestedItemIds,
      vehicleContextLines: [
        `hasExposedChainSprocket = ${vehicleContext.hasExposedChainSprocket}`,
        `powerType = gasoline`,
      ],
      knownIssuesLines: buildKnownIssuesBlock(knownIssues),
    })
    const [globalPrompt, groupPrompt] = await Promise.all([
      resolvePromptText('global-inspection-v2'),
      resolvePromptText('core-vision-engine-bottom-v1'),
    ])
    const promptText = `${globalPrompt}\n\n${groupPrompt}\n\n${contextText}`

    const results = await params.provider.analyze({
      apiKey: params.apiKey,
      promptText,
      promptVersion: `${CORE_VISION_ENGINE_BOTTOM_V1_PROMPT_VERSION}:${hashPromptText(promptText)}`,
      images,
      requestedItemIds,
    })

    validateGeminiResults(results, {
      requestedItemIds,
      attempt: 1,
      validEvidenceIds: new Set(images.map((image) => image.evidenceId)),
    })

    await writeResults(params.verificationId, results, CORE_VISION_ENGINE_BOTTOM_V1_PROMPT_VERSION)

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
