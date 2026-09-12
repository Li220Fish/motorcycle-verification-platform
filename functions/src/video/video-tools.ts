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

/** Matches ffmpeg's own progress log lines (`...time=01:23:45.67 ...`,
 *  written to stderr throughout a run) — used to recover the real duration
 *  by decoding, when the container's own header has none. */
const FFMPEG_TIME_LOG_RE = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/g

function lastLoggedTimeMs(ffmpegOutput: string): number {
  let lastMs = 0
  for (const match of ffmpegOutput.matchAll(FFMPEG_TIME_LOG_RE)) {
    const [, hours, minutes, seconds] = match
    lastMs = (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000
  }
  return Math.round(lastMs)
}

/** Chrome's MediaRecorder (video-recorder.service.ts — every video capture
 *  in this app, including Step 39's cold-touch clip) streams WebM output as
 *  it records and never seeks back to patch a final Segment `Duration` into
 *  the container header once recording stops — a long-standing Chromium
 *  muxer limitation, not a corrupt or unusual recording. `ffprobe
 *  -show_entries format=duration` reads exactly that missing header field
 *  and reports "N/A" for a perfectly good, fully-playable file, which
 *  previously surfaced as "Could not determine video duration" and failed
 *  the whole analysis outright (reproduced live 2026-09 on a real cold-touch
 *  check). Falls back to actually decoding the stream end-to-end
 *  (`ffmpeg -f null -`, discarding the decoded output) and reading the real
 *  elapsed time off ffmpeg's own progress log — this doesn't depend on the
 *  container's header at all, so it works regardless of what the muxer did
 *  or didn't write. `-max_muxing_queue_size` is required, not optional —
 *  verified against a real stuck cold-touch recording (2026-09): its
 *  audio/video packet interleaving was uneven enough that ffmpeg's default
 *  queue size hit "Too many packets buffered for output stream" and aborted
 *  entirely before this flag was added, a second failure mode hiding behind
 *  the first. */
async function probeDurationByDecoding(inputPath: string): Promise<number> {
  let output = ''
  try {
    const { stderr } = await execFileAsync(FFMPEG_PATH, [
      '-i',
      inputPath,
      '-max_muxing_queue_size',
      '9999',
      '-f',
      'null',
      '-',
    ])
    output = stderr
  } catch (error) {
    // A non-zero exit still normally means real frames were decoded up to
    // some point — execFile's promisified error carries stdout/stderr from
    // the process same as a successful resolve, so still worth reading.
    output = (error as { stderr?: string }).stderr ?? ''
  }
  const ms = lastLoggedTimeMs(output)
  if (ms <= 0) throw new Error('Could not determine video duration')
  return ms
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
    if (Number.isFinite(seconds)) return Math.round(seconds * 1000)
    return probeDurationByDecoding(inputPath)
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
