import { GeminiItemResult } from '../schemas/common'
import { buildResultsSchema } from '../schemas/schema-builder'
import { callGeminiInspection, AudioPart } from '../gemini/client'

export interface AudioAnalyzeRequest {
  apiKey: string
  promptText: string
  promptVersion: string
  audio: AudioPart
  requestedItemIds: string[]
}

/** Not folded into VisionInspectionProvider (Engine Audio/IMU Technical spec
 *  §78: "如果現有 VisionInspectionProvider 不要硬把 Audio 塞進 Vision
 *  interface") — separate interface, same underlying Gemini client. */
export interface AudioInspectionProvider {
  analyze(request: AudioAnalyzeRequest): Promise<GeminiItemResult[]>
}

export class GeminiAudioInspectionProvider implements AudioInspectionProvider {
  async analyze(request: AudioAnalyzeRequest): Promise<GeminiItemResult[]> {
    const envelope = await callGeminiInspection({
      apiKey: request.apiKey,
      promptText: request.promptText,
      audio: [request.audio],
      responseSchema: buildResultsSchema(request.requestedItemIds),
      requestedItemIds: request.requestedItemIds,
      promptVersion: request.promptVersion,
    })
    return envelope.results
  }
}

export class MockAudioInspectionProvider implements AudioInspectionProvider {
  constructor(private readonly fixedResults: GeminiItemResult[]) {}

  async analyze(request: AudioAnalyzeRequest): Promise<GeminiItemResult[]> {
    return request.requestedItemIds.map(
      (itemId) =>
        this.fixedResults.find((result) => result.itemId === itemId) ?? {
          itemId,
          result: 'normal',
          confidence: 0.9,
          label: 'mock_normal',
          note: null,
          evidenceIds: [request.audio.evidenceId],
          problematicEvidenceIds: [],
          retakeInstruction: null,
        },
    )
  }
}
