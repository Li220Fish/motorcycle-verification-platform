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

export const SEAT_CONDITION_RETRY_VERSION = 'seat-condition-v1'
export const SEAT_CONDITION_RETRY_PROMPT = `ITEM: seat_condition

Evaluate ONLY the seat surface.

Look for:
- tears
- holes
- cracks
- peeling
- severe visible wear
- obvious repair patches

Do not analyze any other motorcycle component.

If the relevant seat surface is sufficiently visible:
return normal or attention.

If it remains insufficiently visible:
return unsure.`

export const GROUP_A_RETRY_PROMPTS: Record<string, { version: string; prompt: string }> = {
  body_damage: { version: BODY_DAMAGE_RETRY_VERSION, prompt: BODY_DAMAGE_RETRY_PROMPT },
  paint_condition: { version: PAINT_CONDITION_RETRY_VERSION, prompt: PAINT_CONDITION_RETRY_PROMPT },
  body_alignment_visual: {
    version: BODY_ALIGNMENT_RETRY_VERSION,
    prompt: BODY_ALIGNMENT_RETRY_PROMPT,
  },
  seat_condition: { version: SEAT_CONDITION_RETRY_VERSION, prompt: SEAT_CONDITION_RETRY_PROMPT },
}
