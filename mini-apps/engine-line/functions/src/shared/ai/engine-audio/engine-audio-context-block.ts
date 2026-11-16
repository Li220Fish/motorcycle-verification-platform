import { RecordingAssessment } from './audio-quality-analyzer'
import { PhaseAssessment } from './engine-phase-analyzer'
import { EngineEvent } from './engine-event-detector'
import { PhaseFeatureSummary } from './audio-feature-extractor'
import { TransientAssessment } from './transient-detector'

export interface EngineAudioContextInput {
  recordingAssessment: RecordingAssessment
  phaseAssessment: PhaseAssessment
  detectedEvents: EngineEvent[]
  dspSummary: {
    startup: PhaseFeatureSummary
    idle: PhaseFeatureSummary
    rev: PhaseFeatureSummary
  }
  transientAssessment: TransientAssessment
}

/**
 * Spec §19: Gemini gets the deterministic pipeline's summary, not raw DSP
 * arrays — `dspSummary` here is already the per-phase aggregate (means/
 * ratios), never the full per-window timeline (that stays in-memory only,
 * consumed by engine-event-detector.ts, and is never serialized at all).
 * Appended to the fixed engine-audio-v3 prompt text as one extra text block
 * — the shared Gemini client (ai/gemini/client.ts) only accepts a single
 * promptText string, so this is built here rather than as a new content-part
 * type.
 */
export function buildEngineAudioContextBlock(input: EngineAudioContextInput): string {
  return [
    '',
    '--------------------------------------------------',
    'SYSTEM-PROVIDED DETERMINISTIC ANALYSIS (authoritative — do not re-derive phase timing or override confirmed events):',
    JSON.stringify({
      recordingAssessment: input.recordingAssessment,
      phaseAssessment: input.phaseAssessment,
      detectedEvents: input.detectedEvents,
      dspSummary: input.dspSummary,
      transientAssessment: input.transientAssessment,
    }),
    '',
    'How to read the fields added by the transient pass:',
    '- transientAssessment comes from a separate 2-8 kHz, 23 ms-window analysis built specifically to surface short mechanical tapping/knock events. The main dspSummary windows are 250 ms and are measurably unable to resolve such events, so an absence of them in dspSummary is not evidence that none occurred.',
    '- transientAssessment.<phase>.analyzed === false means the measurement could NOT be made (notAnalyzedReason says why). Treat that as missing information, never as "no abnormal transients found".',
    '- repeating === true means the detected transients recur at regular intervals, which is what distinguishes a mechanical knock from an incidental bump such as a dropped tool or a hand touching the phone.',
    '- recordingAssessment.idleTooUnsteady and .ambientTooLoud describe the recording, not the engine. When either is true, prefer unsure over a confident verdict on fine acoustic detail.',
  ].join('\n')
}
