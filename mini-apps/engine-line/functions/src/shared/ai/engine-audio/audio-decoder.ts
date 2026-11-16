import { extractPcmAudio } from '../../video/video-tools'
import { ENGINE_AUDIO_CONFIG } from './engine-audio.config'

/** Normalized to [-1, 1] float samples — every downstream DSP stage works in
 *  this domain, matching how Web Audio's own decodeAudioData exposes PCM. */
export interface DecodedAudio {
  samples: Float32Array
  sampleRateHz: number
}

/**
 * AudioDecoder stage. `extractPcmAudio` (video-tools.ts) already does the
 * real work — a tested ffmpeg-based decoder that handles any container/codec
 * ffmpeg can read, previously used only for video buffers but equally valid
 * for an audio-only buffer (ffmpeg auto-detects the input format from its
 * content, not from a caller-supplied mimeType/extension). Reused as-is
 * rather than duplicated.
 */
export async function decodeEngineAudio(buffer: Buffer): Promise<DecodedAudio> {
  const { samples, sampleRateHz } = await extractPcmAudio(buffer)
  if (sampleRateHz !== ENGINE_AUDIO_CONFIG.sampleRateHz) {
    // extractPcmAudio always asks ffmpeg for ENGINE_AUDIO_CONFIG.sampleRateHz
    // (22.05kHz) — this only fires if that shared constant and this
    // pipeline's own config drift apart.
    throw new Error(
      `Unexpected decoded sample rate ${sampleRateHz}Hz (expected ${ENGINE_AUDIO_CONFIG.sampleRateHz}Hz)`,
    )
  }
  const floatSamples = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) floatSamples[i] = samples[i] / 32768
  return { samples: floatSamples, sampleRateHz }
}
