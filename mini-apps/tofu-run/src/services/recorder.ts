import { VoiceRecorder } from 'capacitor-voice-recorder'

// Extracted from the RiDE app (src/services/media/audio-recorder.service.ts).

export interface AudioRecordingResult {
  blob: Blob
  durationMs: number
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

async function checkPermission(): Promise<void> {
  const has = await VoiceRecorder.hasAudioRecordingPermission()
  if (!has.value) {
    const granted = await VoiceRecorder.requestAudioRecordingPermission()
    if (!granted.value) throw new Error('需要麥克風權限才能錄下引擎聲音')
  }
  const canRecord = await VoiceRecorder.canDeviceVoiceRecord()
  if (!canRecord.value) throw new Error('這支手機無法錄音')
}

async function start(): Promise<void> {
  await checkPermission()
  const result = await VoiceRecorder.startRecording()
  if (!result.value) throw new Error('無法開始錄音')
}

async function stop(): Promise<AudioRecordingResult> {
  const recording = await VoiceRecorder.stopRecording()
  const { recordDataBase64, mimeType, msDuration } = recording.value
  if (!recordDataBase64) throw new Error('沒有錄到聲音')
  return { blob: base64ToBlob(recordDataBase64, mimeType), durationMs: msDuration }
}

function cancel(): void {
  VoiceRecorder.stopRecording().catch(() => {})
}

export const recorder = { checkPermission, start, stop, cancel }
