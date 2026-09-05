export const GROUP_B_PROMPT_VERSION = 'chassis-v1'

export const GROUP_B_PROMPT = `GROUP: chassis

Analyze only the requested Group B inspection items.

This group performs VISUAL ABNORMALITY SCREENING only.

Do not perform physical measurements or infer mechanical performance.

==================================================
ITEM: front_tire_condition
==================================================

Purpose:
Inspect visually observable front-tire condition.

Look for:
- visible cracks
- cuts
- bulges
- foreign objects
- obvious uneven wear
- obvious center wear
- obvious side wear
- visible surface damage

Do NOT:
- estimate tread depth in millimeters without a calibrated measurement reference
- estimate remaining tire life
- predict remaining mileage
- claim legal compliance from image-only evidence

normal:
The relevant visible tread and tire surfaces are sufficiently clear and no obvious visual abnormality is found.

attention:
A clear visible tire abnormality is present.

unsure:
Relevant tire surfaces are not sufficiently visible due to framing, blur, glare, obstruction, distance, or insufficient tread coverage.

==================================================
ITEM: rear_tire_condition
==================================================

Apply the same inspection principles as front_tire_condition, but evaluate ONLY the rear tire.

Do not confuse front and rear evidence.

==================================================
ITEM: front_suspension_condition
==================================================

Purpose:
Inspect visually observable front-suspension exterior condition.

Look for:
- visible oily residue suggestive of leakage
- rust
- scratches
- visible surface damage
- obvious visible deformation

Do NOT infer:
- damping performance
- confirmed seal failure
- internal mechanical condition
- repair necessity

normal:
Relevant visible suspension surfaces are sufficiently visible and no clear visual abnormality is found.

attention:
A clear visible exterior abnormality is present.

For possible leakage, use cautious language such as:
- "可見疑似油性殘留"
- "可能存在滲漏跡象"

unsure:
Critical suspension surfaces are obscured, blurred, reflective, poorly lit, or not sufficiently captured.

==================================================
ITEM: rear_suspension_condition
==================================================

Apply the same principles as front_suspension_condition, but evaluate ONLY rear-suspension evidence.

==================================================
ITEM: front_brake_condition
==================================================

Purpose:
Inspect visually observable front-brake component condition.

Look for:
- visible rust
- obvious grooves
- visible surface damage
- contamination
- visible missing or damaged external components

Do NOT:
- estimate brake pad thickness without a calibrated reference
- estimate brake-disc thickness
- infer braking force
- claim braking performance is safe or unsafe from image-only evidence

normal:
Relevant visible brake components are sufficiently visible and no clear visual abnormality is found.

attention:
A clear visible external abnormality is present.

unsure:
Relevant brake components are not sufficiently visible.

==================================================
ITEM: rear_brake_condition
==================================================

Purpose:
Inspect visually observable rear-brake component condition.

The visible brake type may be:
- disc
- drum
- uncertain

For disc brakes:
Apply the same visual rules as front_brake_condition.

For drum brakes:
Only inspect externally visible parts.

Do NOT infer:
- internal drum-brake shoe condition
- internal wear
- braking performance

normal:
Relevant externally visible components are sufficiently visible and no clear visual abnormality is found.

attention:
A clear visible external abnormality is present.

unsure:
The relevant external components are not sufficiently visible.

==================================================
ITEM: triple_clamp_condition
==================================================

Purpose:
Inspect visually observable triple-clamp / steering-stop exterior condition.

Look for:
- rust
- obvious surface damage
- visibly damaged fastener heads
- visible tool-contact marks
- obvious visible steering-stop damage

Do NOT infer:
- accident history
- frame damage
- confirmed disassembly history
- steering geometry
- structural integrity

normal:
Relevant areas are sufficiently visible and no clear visual abnormality is found.

attention:
A clear visible abnormality is present.

For tool marks:
Use cautious wording such as:
"固定螺絲頭可見疑似工具接觸痕跡"

Never state:
"一定拆過"

unsure:
Required areas, fasteners, or steering-stop regions cannot be seen reliably.

==================================================
GROUP RULES
==================================================

Evaluate every requested item independently.

Only return requestedItems.

Do not convert lack of measurement into an attention result.

Do not infer performance from appearance.

Do not infer accident history.

Do not infer legal compliance.

Use only evidence explicitly supplied in the request.`

export const GROUP_B_ITEM_IDS = [
  'front_tire_condition',
  'rear_tire_condition',
  'front_suspension_condition',
  'rear_suspension_condition',
  'front_brake_condition',
  'rear_brake_condition',
  'triple_clamp_condition',
] as const
export type GroupBItemId = (typeof GROUP_B_ITEM_IDS)[number]

export const GROUP_B_EVIDENCE_VIEWS = [
  'front_wheel',
  'rear_wheel',
  'front_suspension',
  'rear_suspension',
  'front_brake',
  'rear_brake',
  'triple_clamp',
] as const
export type GroupBEvidenceView = (typeof GROUP_B_EVIDENCE_VIEWS)[number]
