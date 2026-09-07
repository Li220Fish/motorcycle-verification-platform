/** Verification v2 — retry templates for the 7 Core Vision v2 items.
 *  body_damage/paint_condition/body_alignment_visual/chain_sprocket_condition
 *  are carried over unchanged from the retired Group A/C retry files;
 *  front_suspension_condition drops Group B's front/rear parameterization
 *  (rear_suspension_condition no longer exists); engine_bottom_leak/
 *  external_condition are narrowed from the old engine_leak/external
 *  templates to engine_bottom only (engine_left/engine_right no longer
 *  exist). */
export const BODY_DAMAGE_RETRY_VERSION = 'body-damage-v1'
export const BODY_DAMAGE_RETRY_PROMPT = `ITEM: body_damage

Evaluate ONLY exterior body damage in the newly supplied retake evidence.

Look for:
- scratches
- cracks
- dents
- broken exterior panels
- missing exterior pieces
- obvious visible deformation

Do NOT evaluate:
- paint condition
- body alignment
- accident history
- hidden damage
- repair history

If the relevant exterior surface is now sufficiently visible:
return normal or attention.

If it still cannot be inspected reliably:
return unsure.`

export const PAINT_CONDITION_RETRY_VERSION = 'paint-condition-v1'
export const PAINT_CONDITION_RETRY_PROMPT = `ITEM: paint_condition

Evaluate ONLY visible paint condition.

The newly captured image is the primary retake evidence.

Use supplied comparison evidence only when lighting and exposure are sufficiently comparable.

Look for:
- obvious color mismatch
- inconsistent paint texture
- visible overspray
- abnormal paint boundary
- visible evidence suggestive of repainting or touch-up

Do NOT infer:
- accident history
- repair reason
- repair date
- paint thickness

Do not treat lighting difference alone as repaint evidence.

If evidence supports possible repainting or touch-up:
return attention and describe the exact visible observation and location.

If the paint appears sufficiently visible and no clear abnormality is found:
return normal.

If lighting, reflection, exposure, or angle still prevents reliable comparison:
return unsure.`

export const BODY_ALIGNMENT_RETRY_VERSION = 'body-alignment-visual-v1'
export const BODY_ALIGNMENT_RETRY_PROMPT = `ITEM: body_alignment_visual

Evaluate ONLY obvious visual exterior asymmetry or deformation.

Use:
- vehicle_left
- vehicle_right
- vehicle_rear

as available and explicitly supplied.

Look only for:
- obvious visual asymmetry
- clearly displaced exterior panels
- obvious visible deformation
- abnormal relative positioning of exterior components

Do NOT infer:
- frame damage
- chassis alignment
- structural damage
- accident history

Perspective distortion MUST NOT be treated as vehicle deformation.

Only return attention when a visible difference remains convincing despite reasonable perspective variation.

If the views remain unsuitable for reliable comparison:
return unsure.`

export const FRONT_SUSPENSION_RETRY_VERSION = 'front-suspension-condition-v1'
export const FRONT_SUSPENSION_RETRY_PROMPT = `ITEM: front_suspension_condition

This is the second and final visual inspection attempt.

Evaluate ONLY the visible exterior condition of the front suspension.

Look for:
- oily residue suggestive of leakage
- rust
- scratches
- surface damage
- obvious visible deformation

Do NOT infer:
- damping performance
- internal damage
- confirmed seal failure
- repair necessity

If sufficient visual evidence is now available:
return normal or attention.

If evidence remains insufficient:
return unsure.

Do not request another retake.`

export const ENGINE_BOTTOM_LEAK_RETRY_VERSION = 'engine-bottom-leak-v1'
export const ENGINE_BOTTOM_LEAK_RETRY_PROMPT = `ITEM: engine_bottom_leak_condition

This is the second and final visual inspection attempt.

Evaluate ONLY possible visible external oil/fluid residue or leak-related evidence on the engine bottom.

Look for:
- oily-looking residue
- fluid-like residue
- localized wet surfaces
- visible residue around joints or seams

Do not classify:
- dirt
- water residue
- road grime
- cleaning residue
- mud
- shadow
as a leak unless the evidence specifically supports an oily/fluid-like appearance.

Do NOT diagnose:
- leak source
- failed seal
- failed gasket
- internal engine fault

If sufficient evidence is available:
return normal or attention.

If the visual evidence remains ambiguous:
return unsure.

Do not request another retake.`

export const ENGINE_BOTTOM_EXTERNAL_RETRY_VERSION = 'engine-bottom-external-v1'
export const ENGINE_BOTTOM_EXTERNAL_RETRY_PROMPT = `ITEM: engine_bottom_external_condition

This is the second and final visual inspection attempt.

Evaluate ONLY visible engine bottom exterior condition.

Look for:
- rust
- scratches
- impact-like surface damage
- cracks
- visible surface damage
- obvious visible deformation

Do not evaluate:
- leak diagnosis
- paint history
- disassembly history
- internal engine condition

If sufficient evidence is available:
return normal or attention.

If evidence remains insufficient:
return unsure.

Do not request another retake.`

export const CHAIN_SPROCKET_RETRY_VERSION = 'chain-sprocket-v1'
export const CHAIN_SPROCKET_RETRY_PROMPT = `ITEM: chain_sprocket_condition

This is the second and final visual inspection attempt.

Evaluate ONLY the exposed motorcycle chain and sprocket.

Look for:
- visible chain rust
- chain surface damage
- visibly abnormal chain links
- sprocket rust
- visibly abnormal sprocket tooth shape
- visible sprocket damage
- foreign material

Do NOT:
- estimate chain slack
- estimate chain elongation
- estimate remaining life
- infer chain noise
- infer gearbox condition
- infer clutch condition
- inspect CVT internals
- inspect drive-belt condition

If relevant chain and sprocket areas are sufficiently visible:
return normal or attention.

If they remain insufficiently visible:
return unsure.

Do not request another retake.`

export const CORE_VISION_V2_RETRY_PROMPTS: Record<string, { version: string; prompt: string }> = {
  body_damage: { version: BODY_DAMAGE_RETRY_VERSION, prompt: BODY_DAMAGE_RETRY_PROMPT },
  paint_condition: { version: PAINT_CONDITION_RETRY_VERSION, prompt: PAINT_CONDITION_RETRY_PROMPT },
  body_alignment_visual: {
    version: BODY_ALIGNMENT_RETRY_VERSION,
    prompt: BODY_ALIGNMENT_RETRY_PROMPT,
  },
  front_suspension_condition: {
    version: FRONT_SUSPENSION_RETRY_VERSION,
    prompt: FRONT_SUSPENSION_RETRY_PROMPT,
  },
  engine_bottom_leak_condition: {
    version: ENGINE_BOTTOM_LEAK_RETRY_VERSION,
    prompt: ENGINE_BOTTOM_LEAK_RETRY_PROMPT,
  },
  engine_bottom_external_condition: {
    version: ENGINE_BOTTOM_EXTERNAL_RETRY_VERSION,
    prompt: ENGINE_BOTTOM_EXTERNAL_RETRY_PROMPT,
  },
  chain_sprocket_condition: {
    version: CHAIN_SPROCKET_RETRY_VERSION,
    prompt: CHAIN_SPROCKET_RETRY_PROMPT,
  },
}
