export const GROUP_A_PROMPT_VERSION = 'exterior-v1'

export const GROUP_A_PROMPT = `GROUP: exterior

Analyze only requested Group A inspection items.

==================================================
ITEM: body_damage
==================================================

Purpose:
Identify clearly visible exterior body damage.

Look for:
- scratches
- cracks
- dents
- broken exterior panels
- missing exterior pieces
- obvious impact-like visible deformation
- other clearly visible exterior surface damage

Do NOT infer:
- accident history
- hidden damage
- structural damage
- repair cost
- repair history

normal:
The relevant supplied exterior surfaces are sufficiently visible and no clear visible body damage is found.

attention:
Clearly visible exterior body damage is present.

unsure:
Blur, glare, obstruction, missing coverage, excessive distance, or unsuitable viewing angle prevents reliable assessment.

When attention:
State the visible damage and its location.

==================================================
ITEM: paint_condition
==================================================

Purpose:
Identify visually observable abnormal paint appearance.

Look for:
- obvious color mismatch
- inconsistent paint texture
- visible overspray
- abnormal paint boundaries
- visually suspicious repaint or touch-up evidence

Do NOT infer:
- when paint work occurred
- why paint work occurred
- accident history
- paint thickness
- hidden repair work

normal:
No clear abnormal paint difference is visible in evidence that is sufficiently comparable.

attention:
Visible paint differences or paint-surface features suggest possible repainting or touch-up.

Use cautious language such as:
- 疑似補漆
- 疑似重新噴漆
- 可見色差
- 漆面紋理存在差異

unsure:
Lighting, exposure, reflection, viewing angle, or image quality makes paint comparison unreliable.

Do not treat lighting difference alone as repaint evidence.

==================================================
ITEM: body_alignment_visual
==================================================

Purpose:
Identify only obvious visible exterior asymmetry or deformation.

Look for:
- obvious visual asymmetry
- clearly displaced exterior panels
- obvious visible deformation
- abnormal relative positioning of exterior body components

Do NOT infer:
- frame damage
- chassis alignment
- structural integrity
- accident history
- measured geometry

normal:
No obvious visible exterior asymmetry or deformation is found in evidence suitable for comparison.

attention:
A clear visible asymmetry, displacement, or deformation remains evident despite reasonable perspective variation.

unsure:
Perspective, framing, distance, missing views, or obstruction prevents reliable comparison.

IMPORTANT:
Be conservative.
Perspective distortion alone MUST NOT produce an attention result.

==================================================
ITEM: seat_condition
==================================================

Purpose:
Inspect visible seat-surface condition.

Look for:
- tears
- holes
- cracks
- peeling
- severe visible wear
- obvious repair patches

normal:
The relevant seat surface is sufficiently visible and no clear damage is found.

attention:
Visible seat damage or significant visible wear is present.

unsure:
The seat is not sufficiently visible because of framing, blur, obstruction, overexposure, or lack of detail.

==================================================
GROUP RULES
==================================================

Evaluate each requested item independently.
Only return requestedItems.
Do not analyze visible modifications.
Do not infer accident history.
Do not infer hidden mechanical condition.
Use only evidence explicitly supplied in this request.`

export const GROUP_A_ITEM_IDS = [
  'body_damage',
  'paint_condition',
  'body_alignment_visual',
  'seat_condition',
] as const
export type GroupAItemId = (typeof GROUP_A_ITEM_IDS)[number]

export const GROUP_A_EVIDENCE_VIEWS = [
  'vehicle_left',
  'vehicle_right',
  'vehicle_rear',
  'seat',
] as const
export type GroupAEvidenceView = (typeof GROUP_A_EVIDENCE_VIEWS)[number]
