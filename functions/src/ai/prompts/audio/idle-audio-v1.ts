export const IDLE_AUDIO_PROMPT_VERSION = 'idle-audio-v1'

export const IDLE_AUDIO_PROMPT = `Analyze only the motorcycle idle-engine audio.

ITEM:
engine_idle_sound

Look for:
- repeated metallic-like knocking sounds
- obvious irregular acoustic events
- repeated sharp/high-frequency abnormal sounds
- strong unexpected energy variation
- unstable repeated engine-sound patterns

Do NOT diagnose the mechanical cause.

Do NOT claim:
- valve failure
- piston knock
- bearing failure
- injector failure
unless such information is provided by another verified measurement source.

If background noise prevents reliable separation:
return unsure.`

export const IDLE_AUDIO_ITEM_IDS = ['engine_idle_sound'] as const
