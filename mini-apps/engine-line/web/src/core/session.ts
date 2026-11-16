/** RiDE's 熱車檢查 timeline: 0–9 s idle, 9–18 s rev (the engineline
 *  functions slice audio and IMU with these same bounds). */
export const SESSION_DURATION_MS = 18000
export const REV_START_MS = 9000

export interface ImuSample {
  tMs: number
  ax: number
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
}

export type RawSample = Omit<ImuSample, 'tMs'> & { t: number }

export function instructionAt(elapsedMs: number): string {
  if (elapsedMs < REV_START_MS - 1500) return '保持怠速，不要碰手機'
  if (elapsedMs < REV_START_MS) return '準備催油門…'
  return '輕催油門幾下（不要催到底）'
}

/** Rebases sample times onto the recording start and drops samples outside
 *  the 18 s window; also reports the effective sample rate. */
export function normalizeSamples(raw: RawSample[], startedAt: number): { samples: ImuSample[]; rateHz: number } {
  const samples = raw
    .map(({ t, ...rest }) => ({ tMs: Math.round(t - startedAt), ...rest }))
    .filter((sample) => sample.tMs >= 0 && sample.tMs < SESSION_DURATION_MS)
  const rateHz = samples.length > 1 ? Math.round((samples.length * 1000) / SESSION_DURATION_MS) : 0
  return { samples, rateHz }
}

/** Picks a recording format both MediaRecorder and the server's ffmpeg handle. */
export function pickMimeType(isSupported: (type: string) => boolean): string {
  for (const type of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (isSupported(type)) return type
  }
  return ''
}

export const RESULT_LABEL: Record<string, string> = {
  normal: '正常',
  attention: '需要注意',
  unsure: '無法判斷',
}

export const RESULT_ICON: Record<string, string> = { normal: '✅', attention: '⚠️', unsure: '❔' }

/** Tags staff attach to a recording for the research dataset. */
export const RESEARCH_LABELS = [
  '正常',
  '怠速不穩',
  '異音-敲缸',
  '異音-氣門',
  '異音-皮帶/傳動',
  '異音-排氣',
  '異音-軸承',
  '環境噪音',
  '錄音品質差',
  '需再追蹤',
] as const
