export const REV_AUDIO_PROMPT_VERSION = 'rev-audio-v1'

export const REV_AUDIO_PROMPT = `Analyze only the motorcycle engine audio during the guided throttle session.

ITEM:
engine_rev_sound

Look for:
- continuity of engine sound while throttle input changes
- repeated abnormal metallic-like sounds
- sudden sharp abnormal acoustic events
- irregular sound transitions
- abnormal sound patterns that appear repeatedly during throttle changes

Do NOT estimate exact RPM.

Do NOT diagnose a specific failed component.

If environmental noise or recording quality prevents reliable assessment:
return unsure.`

export const REV_AUDIO_ITEM_IDS = ['engine_rev_sound'] as const
