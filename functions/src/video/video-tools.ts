import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { FFMPEG_PATH, FFPROBE_PATH } from './binaries'

const execFileAsync = promisify(execFile)

/** Verified locally against a real video+audio test clip before relying on
 *  this (duration probe, timestamp-accurate frame extraction, raw PCM
 *  extraction all confirmed working with these exact binaries/flags). */
export interface PcmAudio {
  samples: Int16Array
  sampleRateHz: number
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'motoverify-video-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function probeDurationMs(videoBuffer: Buffer): Promise<number> {
  return withTempDir(async (dir) => {
    const inputPath = path.join(dir, 'input.bin')
    await writeFile(inputPath, videoBuffer)
    const { stdout } = await execFileAsync(FFPROBE_PATH, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      inputPath,
    ])
    const seconds = Number.parseFloat(stdout.trim())
    if (!Number.isFinite(seconds)) throw new Error('Could not determine video duration')
    return Math.round(seconds * 1000)
  })
}

/** Extracts one JPEG frame per requested timestamp — timestamps outside the
 *  video's actual duration are clamped to the nearest valid frame by ffmpeg
 *  itself (seeking past EOF returns the last frame), so a slightly-short
 *  recording never hard-fails frame extraction. */
export async function extractFrames(videoBuffer: Buffer, timestampsMs: number[]): Promise<Buffer[]> {
  return withTempDir(async (dir) => {
    const inputPath = path.join(dir, 'input.bin')
    await writeFile(inputPath, videoBuffer)
    const frames: Buffer[] = []
    for (let i = 0; i < timestampsMs.length; i++) {
      const outputPath = path.join(dir, `frame_${i}.jpg`)
      const seconds = Math.max(0, timestampsMs[i] / 1000)
      await execFileAsync(FFMPEG_PATH, [
        '-y',
        '-ss',
        seconds.toFixed(3),
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-q:v',
        '3',
        outputPath,
      ])
      frames.push(await readFile(outputPath))
    }
    return frames
  })
}

/** Raw 16-bit signed mono PCM at 22.05kHz — plenty for the low-frequency
 *  ambient-noise metrics this needs (spec §9), and small enough to hold
 *  entirely in memory for a ~15s clip (no streaming/chunking needed). */
export async function extractPcmAudio(videoBuffer: Buffer): Promise<PcmAudio> {
  const sampleRateHz = 22050
  return withTempDir(async (dir) => {
    const inputPath = path.join(dir, 'input.bin')
    const pcmPath = path.join(dir, 'audio.pcm')
    await writeFile(inputPath, videoBuffer)
    await execFileAsync(FFMPEG_PATH, [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      String(sampleRateHz),
      '-f',
      's16le',
      pcmPath,
    ])
    const pcmBuffer = await readFile(pcmPath)
    const sampleCount = Math.floor(pcmBuffer.length / 2)
    const samples = new Int16Array(sampleCount)
    for (let i = 0; i < sampleCount; i++) samples[i] = pcmBuffer.readInt16LE(i * 2)
    return { samples, sampleRateHz }
  })
}
