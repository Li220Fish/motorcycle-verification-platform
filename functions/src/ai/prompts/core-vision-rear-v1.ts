export const CORE_VISION_REAR_V1_PROMPT_VERSION = 'core-vision-rear-v1'

/** Verification v2 migration — one of 4 routes core-vision-v2.ts (deleted)
 * was split into. body_alignment_visual moved here (and ONLY here) per a
 * deliberate design change: two separately-shot left/right side photos give
 * Gemini no shared visual frame to compare against each other (different
 * angle/distance/framing each time), so any "asymmetry" inferred from them
 * would likely be a photography artifact rather than a real defect. A single
 * rear-view photo naturally shows both halves of the vehicle from one
 * consistent camera position, which is the only evidence view that actually
 * supports a left-right symmetry judgment — see the ITEM section below for
 * the reasoning method. */
export const CORE_VISION_REAR_V1_PROMPT = `Analyze the supplied MotoVerify motorcycle rear-view inspection image.

Possible evidence views:

- vehicle_rear

Evaluate each requested item independently.

ITEM: body_damage_rear

Use:
vehicle_rear

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

ITEM: paint_condition_rear

Use:
vehicle_rear

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

--------------------------------------------------

ITEM: body_alignment_visual

Use:
vehicle_rear

This is the only image used for this item. A single rear-view photo shows
both halves of the vehicle from one consistent camera position, which is the
only reliable way to judge left-right symmetry — do not attempt this
judgment from separate left-side/right-side photos even if described
elsewhere, since two independently-shot photos have no shared frame to
compare against each other.

Method:
1. Identify the vehicle's own vertical center axis in this image using
   visible symmetric reference points — the rear tire/wheel center, the
   license plate mounting position, and the tail light housing are usually
   the most reliable. Do NOT assume the photo frame's horizontal center is
   the vehicle's center axis; the vehicle may not be perfectly centered in
   the shot.
2. Mentally mirror one half of the vehicle across that axis and compare it
   against the other half.

Return attention only for clearly visible:
- the rear wheel/tire appearing offset or crooked relative to the tail
  section/frame above it (possible frame or subframe misalignment)
- the tail section, subframe, or exhaust mount appearing visibly twisted or
  tilted to one side rather than level
- symmetric trim (turn signals, grab rail, mudguard) sitting at clearly
  uneven heights or angles beyond normal manufacturing/design variation

Do NOT return attention based only on:
- camera angle or perspective distortion
- the vehicle not being centered in the photo frame
- normal single-sided design elements (e.g. a side-mounted exhaust or
  kickstand that is asymmetric by design)
- side-stand lean
- lens distortion

Do NOT diagnose frame damage or estimate repair cost — only report visible
asymmetry as an attention flag for a human to inspect further.

Return every requested item independently.`

export const CORE_VISION_REAR_V1_ITEM_IDS = [
  'body_damage_rear',
  'paint_condition_rear',
  'body_alignment_visual',
] as const
export type CoreVisionRearV1ItemId = (typeof CORE_VISION_REAR_V1_ITEM_IDS)[number]

export const CORE_VISION_REAR_V1_EVIDENCE_VIEWS = ['vehicle_rear'] as const
