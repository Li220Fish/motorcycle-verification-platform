/**
 * Runs the SHIPPED engine-audio pipeline (not a reimplementation) against the
 * two real ENG-03 recordings, and checks it against what the offline
 * experiments measured.
 *
 *   npx ts-node --compiler-options '{"module":"commonjs"}' \
 *     ../../experiments/preprocessing/verify-audio-pipeline.ts
 *
 * Run it from the functions/ directory so its tsconfig and node_modules apply.
 * Needs the two recordings on disk; edit RECORDINGS to point at your own.
 */
import { spawn } from 'node:child_process'

import { analyzeAudioQuality } from '../src/ai/engine-audio/audio-quality-analyzer'
import { preprocessAudio } from '../src/ai/engine-audio/audio-preprocessor'
import { detectTransients } from '../src/ai/engine-audio/transient-detector'
import { ENGINE_AUDIO_CONFIG } from '../src/ai/engine-audio/engine-audio.config'
import type { EngineSessionPhases } from '../src/ai/engine-audio/audio-feature-extractor'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FFMPEG: string = require('@ffmpeg-installer/ffmpeg').path

const RECORDINGS = {
  A: { path: 'D:/Downloads/1789735537560-ENG-03.aac', label: 'steady idle' },
  B: { path: 'D:/Downloads/1789277691470-ENG-03.aac', label: 'unsteady idle' },
}
const PHASES: EngineSessionPhases = {
  startup: { startMs: 0, endMs: 5000 },
  idle: { startMs: 5000, endMs: 14000 },
  rev: { startMs: 14000, endMs: 23000 },
}
const FS = ENGINE_AUDIO_CONFIG.sampleRateHz

function decode(path: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, ['-v', 'error', '-i', path, '-f', 's16le', '-acodec', 'pcm_s16le',
      '-ac', '1', '-ar', String(FS), 'pipe:1'])
    const chunks: Buffer[] = []
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}`))
      const buf = Buffer.concat(chunks)
      const out = new Float32Array(Math.floor(buf.length / 2))
      for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 32768
      resolve(out)
    })
  })
}

/** Same synthetic tap the unit tests use. */
function addTap(samples: Float32Array, atMs: number, amplitude: number): void {
  const start = Math.round((atMs / 1000) * FS)
  const length = Math.round(0.008 * FS)
  for (let i = 0; i < length && start + i < samples.length; i++) {
    const t = i / FS
    const resonance =
      (Math.sin(2 * Math.PI * 3200 * t) +
        Math.sin(2 * Math.PI * 4700 * t) +
        Math.sin(2 * Math.PI * 6300 * t)) / 3
    samples[start + i] += amplitude * Math.exp(-450 * t) * resonance
  }
}

function localRms(samples: Float32Array, atMs: number): number {
  const centre = Math.round((atMs / 1000) * FS)
  const half = Math.round(0.25 * FS)
  const from = Math.max(0, centre - half)
  const to = Math.min(samples.length, centre + half)
  let sum = 0
  for (let i = from; i < to; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / Math.max(1, to - from))
}

let failures = 0
const check = (name: string, pass: boolean, detail: string): void => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!pass) failures++
}

async function main(): Promise<void> {
  for (const [key, meta] of Object.entries(RECORDINGS)) {
    const samples = await decode(meta.path)
    console.log(`\n=== Recording ${key} (${meta.label}) — ${(samples.length / FS).toFixed(1)} s`)

    const quality = analyzeAudioQuality(samples, ENGINE_AUDIO_CONFIG, PHASES)
    console.log(`    idleRmsCv=${quality.idleRmsCv?.toFixed(3)} tooUnsteady=${quality.idleTooUnsteady} ` +
      `ambientMargin=${quality.ambientMarginDb?.toFixed(1)}dB tooLoud=${quality.ambientTooLoud} ` +
      `quality=${quality.audioQuality}`)

    // The offline experiment measured 0.029 (A) and 0.223 (B) for idle RMS CV,
    // and 20.5 dB / 25.9 dB of ambient margin. The shipped code should land in
    // the same place; a large divergence means the two drifted apart.
    const expectedCv = key === 'A' ? 0.029 : 0.223
    check(`${key}: idle RMS CV matches the offline measurement`,
      Math.abs((quality.idleRmsCv ?? 0) - expectedCv) < 0.05,
      `got ${quality.idleRmsCv?.toFixed(3)}, experiment measured ${expectedCv}`)

    const expectedMargin = key === 'A' ? 20.5 : 25.9
    check(`${key}: ambient margin matches the offline measurement`,
      Math.abs((quality.ambientMarginDb ?? 0) - expectedMargin) < 4,
      `got ${quality.ambientMarginDb?.toFixed(1)}dB, experiment measured ${expectedMargin}dB`)

    check(`${key}: idle steadiness gate fires only on the unsteady recording`,
      quality.idleTooUnsteady === (key === 'B'),
      `idleTooUnsteady=${quality.idleTooUnsteady} (expected ${key === 'B'})`)

    // --- clean pass: the real recording as-is should not invent transients ---
    const clean = preprocessAudio({ samples, sampleRateHz: FS }, ENGINE_AUDIO_CONFIG)
    const cleanResult = detectTransients(clean.transientBand, FS, PHASES, quality.idleRmsCv ?? 0, ENGINE_AUDIO_CONFIG)
    console.log(`    clean idle: analyzed=${cleanResult.idle.analyzed} ` +
      `events=${cleanResult.idle.events.length} maxZ=${cleanResult.idle.maxZ} ` +
      `${cleanResult.idle.notAnalyzedReason ?? ''}`)

    if (key === 'A') {
      check('A: a real clean idle produces few/no false transients',
        cleanResult.idle.events.length <= 2,
        `${cleanResult.idle.events.length} events on untouched audio`)
    }

    // --- injected taps: 8 regular taps at 2x the local background RMS ---
    const tapped = Float32Array.from(samples)
    const tapTimesMs: number[] = []
    for (let k = 0; k < 8; k++) {
      const atMs = 5600 + k * 900
      addTap(tapped, atMs, 2 * localRms(samples, atMs))
      tapTimesMs.push(atMs)
    }
    const tappedPre = preprocessAudio({ samples: tapped, sampleRateHz: FS }, ENGINE_AUDIO_CONFIG)
    const tappedResult = detectTransients(tappedPre.transientBand, FS, PHASES, quality.idleRmsCv ?? 0, ENGINE_AUDIO_CONFIG)
    const matched = tapTimesMs.filter((t) =>
      tappedResult.idle.events.some((e) => Math.abs(e.timeMs - t) <= 60)).length
    console.log(`    with 8 injected taps: analyzed=${tappedResult.idle.analyzed} ` +
      `matched=${matched}/8 events=${tappedResult.idle.events.length} ` +
      `repeating=${tappedResult.idle.repeating} maxZ=${tappedResult.idle.maxZ}`)

    if (key === 'A') {
      check('A: injected taps are detected on a real steady idle', matched >= 6, `${matched}/8 taps found`)
      check('A: regularly spaced taps are reported as repeating', tappedResult.idle.repeating, 'repeating flag set')
    } else {
      check('B: an unsteady idle refuses to report rather than guessing',
        tappedResult.idle.analyzed === false && tappedResult.idle.events.length === 0,
        `analyzed=${tappedResult.idle.analyzed} — correctly withheld`)
    }
  }

  console.log(failures === 0
    ? '\nALL CHECKS PASSED against the shipped pipeline'
    : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
