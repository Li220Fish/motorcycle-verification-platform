export const STARTUP_AUDIO_PROMPT_VERSION = 'startup-audio-v1'

export const STARTUP_AUDIO_PROMPT = `Analyze this motorcycle startup audio.

Requested items:

1. starter_motor_sound
2. start_smoothness

starter_motor_sound:

Listen for:
- continuity of starter-motor sound
- repeated interrupted starter engagement
- abnormal sharp or metallic sound patterns
- multiple clear startup attempts

Do NOT diagnose:
- starter motor failure
- battery failure
- gear failure

start_smoothness:

Evaluate the acoustic transition from:
starter engagement
→ engine ignition
→ stable idle

Look for:
- unusually prolonged startup sequence
- repeated attempts
- ignition followed by immediate stop
- obvious irregular transition into idle

Do NOT diagnose:
- fuel-system failure
- ignition-system failure
- low compression

Analyze both items independently.`

export const STARTUP_AUDIO_ITEM_IDS = ['starter_motor_sound', 'start_smoothness'] as const
export type StartupAudioItemId = (typeof STARTUP_AUDIO_ITEM_IDS)[number]
