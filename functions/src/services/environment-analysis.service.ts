import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import { callGeminiJson, ImagePart } from '../ai/gemini/client'
import {
  ENVIRONMENT_VISUAL_PROMPT,
  ENVIRONMENT_VISUAL_PROMPT_VERSION,
  ENVIRONMENT_VISUAL_SCHEMA,
  EnvironmentVisualResult,
} from '../ai/prompts/environment-visual-v1'
import { computeVisualMetrics } from '../video/visual-metrics'
import { extractFrames, extractPcmAudio, probeDurationMs } from '../video/video-tools'
import { computeAmbientAudioMetrics } from '../audio/ambient-audio-metrics'
import { classifyEnvironmentAudio, EnvironmentAudioClassification } from './environment-audio-classifier'
import { resolveVideoEvidence } from './evidence.service'

const FRAME_COUNT = 8
const RISK_WARNING_FIELDS: Array<keyof EnvironmentVisualResult> = [
  'backlightRisk',
  'reflectionRisk',
  'shadowRisk',
  'obstructionRisk',
  'movingObjectInterference',
]

function evenlySpacedTimestamps(durationMs: number, count: number): number[] {
  if (count <= 1) return [Math.floor(durationMs / 2)]
  const timestamps: number[] = []
  for (let i = 0; i < count; i++) {
    // Inset slightly from both ends so the first/last frame isn't a
    // half-formed opening/closing moment of the recording.
    const fraction = (i + 0.5) / count
    timestamps.push(Math.round(durationMs * fraction))
  }
  return timestamps
}

/** Step 3 (Environment Calibration) — Environment/Cold-State spec §35. No
 *  Inspection Item / Answer is written here: the Environment Context lives
 *  on the Verification document itself (spec §2: "不是 Vehicle Condition
 *  Result"), never gates or overwrites any vehicle-condition Answer. */
export async function analyzeEnvironment(params: {
  verificationId: string
  apiKey: string
}): Promise<void> {
  const video = await resolveVideoEvidence(params.verificationId, 'PREP-03')
  const durationMs = await probeDurationMs(video.buffer)

  const frameTimestamps = evenlySpacedTimestamps(durationMs, FRAME_COUNT)
  const frames = await extractFrames(video.buffer, frameTimestamps)
  const visualMetrics = await computeVisualMetrics(frames)

  const images: ImagePart[] = frames.map((frame, index) => ({
    evidenceId: `${video.evidenceId}_frame_${index}`,
    view: 'environment_frame',
    base64: frame.toString('base64'),
    mimeType: 'image/jpeg',
  }))

  const visual = await callGeminiJson<EnvironmentVisualResult>({
    apiKey: params.apiKey,
    promptText: ENVIRONMENT_VISUAL_PROMPT,
    images,
    responseSchema: ENVIRONMENT_VISUAL_SCHEMA,
    cacheDiscriminators: [ENVIRONMENT_VISUAL_PROMPT_VERSION],
    promptVersion: ENVIRONMENT_VISUAL_PROMPT_VERSION,
  })

  // Ambient audio is analyzed deterministically only — Gemini here never
  // receives the audio track, just the extracted frames (spec §7's
  // pipeline lists "Gemini environment semantic analysis" after the visual
  // metrics step, with audio metrics computed independently in §9).
  let audioMetrics = null
  let audioClassification: EnvironmentAudioClassification = {
    noiseLevel: 'low',
    windNoise: 'low',
    audioSuitable: true,
  }
  try {
    const pcm = await extractPcmAudio(video.buffer)
    audioMetrics = computeAmbientAudioMetrics(pcm)
    audioClassification = classifyEnvironmentAudio(audioMetrics)
  } catch {
    // No usable audio track — leave the low-risk defaults above; this only
    // affects the ambient baseline, never blocks Step 3 itself.
  }

  const visualSuitable =
    visual.lightingSuitability !== 'poor' &&
    visual.obstructionRisk !== 'high' &&
    visual.reflectionRisk !== 'high'
  const overallSuitable = visualSuitable && audioClassification.audioSuitable

  const warnings: string[] = []
  for (const field of RISK_WARNING_FIELDS) {
    const value = visual[field]
    if (value === 'moderate') warnings.push(`moderate_${field}`)
    if (value === 'high') warnings.push(`high_${field}`)
  }
  if (visual.lightingSuitability === 'poor') warnings.push('poor_lighting')
  if (!audioClassification.audioSuitable) warnings.push('ambient_audio_unsuitable')

  const environmentContext = {
    videoEvidenceId: video.evidenceId,
    capture: {
      durationMs,
      rotationCoverageDeg: (video.metadata.rotationCoverageDeg as number | undefined) ?? null,
      captureVersion: (video.metadata.captureVersion as string | undefined) ?? 'environment-capture-v1',
    },
    visual: {
      environmentType: visual.environmentType,
      lightingSuitability: visual.lightingSuitability,
      lightingUniformity: visual.lightingUniformity,
      backlightRisk: visual.backlightRisk,
      reflectionRisk: visual.reflectionRisk,
      shadowRisk: visual.shadowRisk,
      spaceAvailability: visual.spaceAvailability,
      obstructionRisk: visual.obstructionRisk,
      movingObjectInterference: visual.movingObjectInterference,
      deterministicMetrics: visualMetrics,
    },
    audio: {
      noiseLevel: audioClassification.noiseLevel,
      windNoise: audioClassification.windNoise,
      audioSuitable: audioClassification.audioSuitable,
      deterministicMetrics: audioMetrics,
    },
    quality: {
      visualSuitable,
      audioSuitable: audioClassification.audioSuitable,
      overallSuitable,
    },
    warnings,
    model: GEMINI_MODEL,
    analysisVersion: ENVIRONMENT_VISUAL_PROMPT_VERSION,
    analyzedAt: Date.now(),
  }

  await getFirestore()
    .collection('verifications')
    .doc(params.verificationId)
    .set({ environmentContext }, { merge: true })
}
