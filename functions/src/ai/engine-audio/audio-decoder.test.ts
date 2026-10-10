import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeEngineAudio } from './audio-decoder'
import { applyHannWindow, computeMagnitudeSpectrum, dominantFrequency } from './dft'

/**
 * The ONE test in this pipeline that actually exercises the real ffmpeg
 * binary (video-tools.ts's extractPcmAudio) rather than pure TypeScript
 * math — every other *.test.ts file in this directory tests DSP/rule logic
 * against hand-built fixtures. This proves ffmpeg genuinely decodes audio
 * correctly in this environment (not mocked), by round-tripping a known
 * tone through a real WAV container and confirming the decoded signal still
 * contains that same tone.
 */

function buildMonoWav(freqHz: number, durationMs: number, sampleRateHz: number): Buffer {
  const sampleCount = Math.round((durationMs / 1000) * sampleRateHz)
  const dataSize = sampleCount * 2 // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16) // fmt chunk size
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRateHz, 24)
  buffer.writeUInt32LE(sampleRateHz * 2, 28) // byte rate
  buffer.writeUInt16LE(2, 32) // block align
  buffer.writeUInt16LE(16, 34) // bits per sample
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < sampleCount; i++) {
    const sample = Math.round(0.8 * 32767 * Math.sin((2 * Math.PI * freqHz * i) / sampleRateHz))
    buffer.writeInt16LE(sample, 44 + i * 2)
  }
  return buffer
}

test('decodeEngineAudio round-trips a real WAV file through ffmpeg and preserves the tone', async () => {
  const toneHz = 300
  const wav = buildMonoWav(toneHz, 1000, 16000)
  const decoded = await decodeEngineAudio(wav)

  assert.equal(decoded.sampleRateHz, 22050)
  // Allow generous slack — ffmpeg's resampler doesn't guarantee an exact
  // sample count for a non-integer ratio (16000 -> 22050).
  assert.ok(decoded.samples.length > 20000 && decoded.samples.length < 23500)

  const windowSamples = decoded.samples.subarray(0, 2048)
  const spectrum = computeMagnitudeSpectrum(applyHannWindow(windowSamples), 22050, 2000, 25)
  const dominantHz = dominantFrequency(spectrum)
  assert.ok(
    Math.abs(dominantHz - toneHz) <= 50,
    `expected ffmpeg-decoded signal's dominant frequency near ${toneHz}Hz, got ${dominantHz}Hz`,
  )
})
