export const CORE_VISION_V2_PROMPT_VERSION = 'core-vision-v2'

/** Verification v2 migration spec §14-§16 — supersedes Group A (exterior-v1),
 *  Group B (chassis-v1), and Group C (engine-powertrain-v1). Consolidates
 *  the 3 surviving Group A items (body_damage/paint_condition/
 *  body_alignment_visual, unchanged), the 1 surviving Group B item
 *  (front_suspension_condition, unchanged), and the 3 surviving/renamed
 *  Group C items (engine_bottom_leak_condition/engine_bottom_external_
 *  condition — narrowed to engine_bottom only, engine_left/engine_right no
 *  longer exist; chain_sprocket_condition, unchanged) into ONE route. */
export const CORE_VISION_V2_PROMPT = `Analyze the supplied MotoVerify motorcycle core inspection images.

Possible evidence views:

- vehicle_left
- vehicle_right
- vehicle_rear
- front_suspension
- engine_bottom
- chain_sprocket

Only analyze chain_sprocket_condition when chain_sprocket evidence is explicitly supplied.

Evaluate each requested item independently.

ITEM: body_damage

Use:
vehicle_left
vehicle_right
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

ITEM: paint_condition

Use:
vehicle_left
vehicle_right
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
vehicle_left
vehicle_right
vehicle_rear

Look only for clearly visible:
- abnormal asymmetry
- obvious panel misalignment
- obvious exterior deformation

Do NOT return attention based only on:
- camera perspective
- side-stand lean
- lens distortion
- asymmetric accessories

Do NOT diagnose frame damage.

--------------------------------------------------

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

--------------------------------------------------

ITEM: engine_bottom_leak_condition

Use:
engine_bottom

Look for:
- clearly visible oily or fluid-like residue
- repeated wet-looking accumulation
- suspicious seepage around visible joints

Do NOT treat:

water
mud
road grime
chain lubricant
cleaning residue
normal dirt
shadow

as leakage.

If evidence cannot reliably distinguish them:

return unsure.

Do NOT diagnose a specific gasket, seal, or component.

--------------------------------------------------

ITEM: engine_bottom_external_condition

Use:
engine_bottom

Look for:
- impact damage
- cracks
- obvious deformation
- severe rust
- obvious external damage

Do NOT infer internal engine condition.

--------------------------------------------------

ITEM: chain_sprocket_condition

Analyze ONLY if chain_sprocket evidence is supplied.

Look for:
- abnormal rust
- visibly damaged chain links
- obvious sprocket tooth damage
- obvious abnormal surface condition

Do NOT assess:
- exact slack
- elongation
- remaining life
- gearbox
- clutch
- CVT
- drive belt

Return every requested item independently.`

export const CORE_VISION_V2_ITEM_IDS = [
  'body_damage',
  'paint_condition',
  'body_alignment_visual',
  'front_suspension_condition',
  'engine_bottom_leak_condition',
  'engine_bottom_external_condition',
  'chain_sprocket_condition',
] as const
export type CoreVisionV2ItemId = (typeof CORE_VISION_V2_ITEM_IDS)[number]

/** Always-fetched evidence views (chain_sprocket is added separately, only
 * when the vehicle actually has an exposed chain — see
 * core-vision-v2.service.ts, mirroring Group C's existing conditional
 * pattern). */
export const CORE_VISION_V2_EVIDENCE_VIEWS = [
  'vehicle_left',
  'vehicle_right',
  'vehicle_rear',
  'front_suspension',
  'engine_bottom',
] as const
