import { GeminiItemResult } from '../schemas/common'
import { buildEngineAudioSchema } from '../schemas/schema-builder'
import { callGeminiInspection, AudioPart } from '../gemini/client'

export interface AudioAnalyzeRequest {
  apiKey: string
  promptText: string
  promptVersion: string
  audio: AudioPart
  requestedItemIds: string[]
}

/** `engineTypeNote` — engine-audio-v3.ts's ENGINE TYPE section, a free-text
 *  (no fixed category, per user decision) impression of what engine type
 *  this sounds like, plus `engineTypeConfidence` (0.0-1.0, backend/admin
 *  traceability only). Neither is a per-item verdict, so both ride
 *  alongside `results` rather than as entries in it. */
export interface AudioAnalyzeResult {
  results: GeminiItemResult[]
  engineTypeNote: string
  engineTypeConfidence: number
}

/** Not folded into VisionInspectionProvider (Engine Audio/IMU Technical spec
 *  §78: "如果現有 VisionInspectionProvider 不要硬把 Audio 塞進 Vision
 *  interface") — separate interface, same underlying Gemini client. */
export interface AudioInspectionProvider {
  analyze(request: AudioAnalyzeRequest): Promise<AudioAnalyzeResult>
}

export class GeminiAudioInspectionProvider implements AudioInspectionProvider {
  async analyze(request: AudioAnalyzeRequest): Promise<AudioAnalyzeResult> {
    const envelope = await callGeminiInspection({
      apiKey: request.apiKey,
      promptText: request.promptText,
      audio: [request.audio],
      responseSchema: buildEngineAudioSchema(request.requestedItemIds),
      requestedItemIds: request.requestedItemIds,
      promptVersion: request.promptVersion,
    })
    return {
      results: envelope.results,
      engineTypeNote: envelope.engineTypeNote ?? '',
      engineTypeConfidence: envelope.engineTypeConfidence ?? 0,
    }
  }
}

export class MockAudioInspectionProvider implements AudioInspectionProvider {
  constructor(
    private readonly fixedResults: GeminiItemResult[],
    private readonly engineTypeNote = 'mock_engine_type',
    private readonly engineTypeConfidence = 0.5,
  ) {}

  async analyze(request: AudioAnalyzeRequest): Promise<AudioAnalyzeResult> {
    const results: GeminiItemResult[] = request.requestedItemIds.map(
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
    return { results, engineTypeNote: this.engineTypeNote, engineTypeConfidence: this.engineTypeConfidence }
  }
}
