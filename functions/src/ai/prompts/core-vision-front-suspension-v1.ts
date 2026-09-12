export const CORE_VISION_FRONT_SUSPENSION_V1_PROMPT_VERSION = 'core-vision-front-suspension-v1'

/** Verification v2 migration — one of 4 routes core-vision-v2.ts (deleted)
 * was split into, so this call fires as soon as the front-suspension photo
 * exists without waiting on the other 3 groups. */
export const CORE_VISION_FRONT_SUSPENSION_V1_PROMPT = `Analyze the supplied MotoVerify motorcycle front suspension inspection image.

Possible evidence views:

- front_suspension

ITEM: front_suspension_condition

Use:
front_suspension

Look for:
- visible oily residue suggesting possible leakage
- abnormal rust
- scratches / external damage
- damaged dust cover
- obvious external deformation

Do NOT:
- diagnose internal seal failure
- assess damping performance
- estimate remaining life

Return every requested item independently.`

export const CORE_VISION_FRONT_SUSPENSION_V1_ITEM_IDS = ['front_suspension_condition'] as const
export type CoreVisionFrontSuspensionV1ItemId =
  (typeof CORE_VISION_FRONT_SUSPENSION_V1_ITEM_IDS)[number]

export const CORE_VISION_FRONT_SUSPENSION_V1_EVIDENCE_VIEWS = ['front_suspension'] as const
