import { GeminiItemResult } from '../schemas/common'
import { buildResultsSchema } from '../schemas/schema-builder'
import { callGeminiInspection, ImagePart } from '../gemini/client'

export interface VisionAnalyzeRequest {
  apiKey: string
  promptText: string
  promptVersion: string
  images: ImagePart[]
  requestedItemIds: string[]
}

/** Swappable so unit tests never hit real Gemini (spec: "Unit Test 主要用
 *  Mock。真正 Gemini 呼叫只放 Integration Test"). Production wiring uses
 *  GeminiVisionInspectionProvider; tests construct MockVisionInspectionProvider
 *  directly with canned results. */
export interface VisionInspectionProvider {
  analyze(request: VisionAnalyzeRequest): Promise<GeminiItemResult[]>
}

export class GeminiVisionInspectionProvider implements VisionInspectionProvider {
  async analyze(request: VisionAnalyzeRequest): Promise<GeminiItemResult[]> {
    const envelope = await callGeminiInspection({
      apiKey: request.apiKey,
      promptText: request.promptText,
      images: request.images,
      responseSchema: buildResultsSchema(request.requestedItemIds),
      requestedItemIds: request.requestedItemIds,
      promptVersion: request.promptVersion,
    })
    return envelope.results
  }
}

export class MockVisionInspectionProvider implements VisionInspectionProvider {
  constructor(private readonly fixedResults: GeminiItemResult[]) {}

  async analyze(request: VisionAnalyzeRequest): Promise<GeminiItemResult[]> {
    return request.requestedItemIds.map(
      (itemId) =>
        this.fixedResults.find((result) => result.itemId === itemId) ?? {
          itemId,
          result: 'normal',
          confidence: 0.9,
          label: 'mock_normal',
          note: null,
          evidenceIds: request.images.map((image) => image.evidenceId),
          problematicEvidenceIds: [],
          retakeInstruction: null,
        },
    )
  }
}
