import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

// Riding feedback is voice-only — nothing on screen the rider needs to read.

export async function say(text: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await TextToSpeech.speak({ text, lang: 'zh-TW', rate: 1.05, category: 'playback' })
    } else if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-TW'
      window.speechSynthesis.speak(utterance)
    }
  } catch {
    // No TTS voice installed — the game still works, just silently.
  }
}

/** Short tone for bumps — WebAudio, no asset files. */
let audioContext: AudioContext | null = null
export function beep(frequency = 520, ms = 160): void {
  try {
    audioContext ??= new AudioContext()
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.frequency.value = frequency
    gain.gain.value = 0.25
    osc.connect(gain).connect(audioContext.destination)
    osc.start()
    osc.stop(audioContext.currentTime + ms / 1000)
  } catch {
    // ignore
  }
}

export async function keepScreenOn(on: boolean): Promise<void> {
  try {
    if (on) await KeepAwake.keepAwake()
    else await KeepAwake.allowSleep()
  } catch {
    // Web / unsupported — not critical.
  }
}
