export const CORE_VISION_SIDES_V1_PROMPT_VERSION = 'core-vision-sides-v1'

/** Verification v2 migration — one of 4 routes core-vision-v2.ts (deleted)
 * was split into, so this call fires as soon as the left+right photos exist
 * without waiting on rear/front-suspension/engine-bottom. body_damage/
 * paint_condition here judge only the left/right side panels — the rear
 * panel gets its own independent verdict from core-vision-rear-v1.ts
 * (body_damage_rear/paint_condition_rear), since the two views are
 * physically different parts of the vehicle. */
export const CORE_VISION_SIDES_V1_PROMPT = `Analyze the supplied MotoVerify motorcycle side-view inspection images.

Possible evidence views:

- vehicle_left
- vehicle_right

Evaluate each requested item independently.

ITEM: body_damage

Use:
vehicle_left
vehicle_right

Look for:
- scratches
- scuffs
- cracks
- dents
- broken exterior panels
- obvious impact marks

Do NOT infer:
- accident history
- past collision severity
- frame damage from minor exterior marks

--------------------------------------------------

ITEM: paint_condition

Use:
vehicle_left
vehicle_right

Look for:
- obvious color mismatch
- abnormal surface texture
- overspray-like evidence
- visually suspicious repaint differences
- major peeling
- major fading

Consider:
- reflection
- lighting
- shadow
- white balance

before returning attention.

Do NOT determine:
- when repainting happened
- why repainting happened
- whether repainting was accident-related

Return every requested item independently.`

export const CORE_VISION_SIDES_V1_ITEM_IDS = ['body_damage', 'paint_condition'] as const
export type CoreVisionSidesV1ItemId = (typeof CORE_VISION_SIDES_V1_ITEM_IDS)[number]

export const CORE_VISION_SIDES_V1_EVIDENCE_VIEWS = ['vehicle_left', 'vehicle_right'] as const
