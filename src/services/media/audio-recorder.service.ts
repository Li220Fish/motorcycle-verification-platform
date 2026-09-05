import { VoiceRecorder } from 'capacitor-voice-recorder'

export interface AudioRecordingResult {
  blob: Blob
  durationMs: number
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

async function ensurePermission(): Promise<void> {
  const has = await VoiceRecorder.hasAudioRecordingPermission()
  if (has.value) return
  const granted = await VoiceRecorder.requestAudioRecordingPermission()
  if (!granted.value) throw new Error('Microphone permission was denied.')
}

/** Exposed so a capture flow can do its own upfront "準備中…" permission
 *  check (see EngineInspectionFlow.vue) before running a countdown, instead
 *  of only discovering a denied permission after the countdown finishes. */
async function checkPermission(): Promise<void> {
  await ensurePermission()
  const canRecord = await VoiceRecorder.canDeviceVoiceRecord()
  if (!canRecord.value) throw new Error('This device cannot record audio.')
}

async function start(): Promise<void> {
  await checkPermission()
  const result = await VoiceRecorder.startRecording()
  if (!result.value) throw new Error('Failed to start recording.')
}

async function stop(): Promise<AudioRecordingResult> {
  const recording = await VoiceRecorder.stopRecording()
  const { recordDataBase64, mimeType, msDuration } = recording.value
  if (!recordDataBase64) throw new Error('No audio data returned.')
  return { blob: base64ToBlob(recordDataBase64, mimeType), durationMs: msDuration }
}

export const audioRecorderService = { start, stop, checkPermission }
