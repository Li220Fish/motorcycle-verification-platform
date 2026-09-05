export const GROUP_C_PROMPT_VERSION = 'engine-powertrain-v1'

export const GROUP_C_PROMPT = `GROUP: engine_powertrain

Analyze only the requested Group C inspection items.

This group performs visual exterior-condition screening only.

Do not infer internal mechanical condition, performance, repair history, or accident history.

==================================================
ITEM: engine_leak_condition
==================================================

Purpose:
Inspect visible engine exterior surfaces for possible oil/fluid residue or leakage-related visual evidence.

Look for:
- oily-looking residue
- fluid-like residue
- localized wet surfaces
- visible residue around joints or seams
- other visible evidence reasonably suggestive of an external leak

IMPORTANT:
Do not classify dirt, water residue, road grime,
chain lubricant, cleaning residue, mud, shadow,
or normal surface discoloration as an oil/fluid leak
unless the visual evidence specifically supports
an oily or fluid-like residue.

If the appearance cannot be reliably distinguished:
return unsure.

Do NOT diagnose:
- failed seals
- failed gaskets
- internal engine faults
- repair necessity

normal:
Relevant visible surfaces are sufficiently clear and no obvious leak-related visual evidence is found.

attention:
Visible evidence reasonably suggestive of an oil/fluid leak is present.

Use cautious wording such as:
- "可見疑似油性殘留"
- "可能存在滲漏跡象"

unsure:
Image quality, obstruction, shadow, contamination, or insufficient coverage prevents reliable assessment.

==================================================
ITEM: engine_external_condition
==================================================

Purpose:
Inspect visible engine exterior condition.

Look for:
- rust
- scratches
- impact-like surface damage
- cracks
- visible surface damage
- obvious visible deformation

Do NOT evaluate:
- leakage
- repaint evidence
- tool marks
unless needed only to avoid misclassification.

Do NOT infer:
- internal engine condition
- engine performance
- repair history

normal:
Relevant visible engine surfaces are sufficiently clear and no obvious exterior abnormality is found.

attention:
A clear visible exterior abnormality is present.

unsure:
Relevant engine surfaces cannot be inspected reliably.

==================================================
ITEM: engine_tool_mark_condition
==================================================

Purpose:
Inspect visible engine fasteners for possible tool-contact marks.

Look for:
- visible tool-contact marks
- fastener-head scratches
- visibly damaged fastener edges
- abnormal fastener surface damage

Do NOT infer:
- confirmed disassembly
- engine overhaul
- repair history
- accident history

IMPORTANT:
Tool marks do not prove disassembly or repair history.

normal:
Relevant fasteners are sufficiently visible and no obvious tool-contact marks are found.

attention:
Clear visible marks suggestive of tool contact are present.

Use cautious language.

unsure:
Relevant fasteners are not sufficiently visible.

==================================================
ITEM: engine_paint_condition
==================================================

Purpose:
Inspect visible engine surfaces for abnormal paint appearance.

Look for:
- obvious color mismatch
- possible repaint evidence
- visible overspray
- abnormal paint boundaries
- inconsistent paint texture

Do NOT infer:
- when repainting occurred
- why repainting occurred
- accident history
- repair history

Do not treat lighting, reflections, shadows, or exposure differences alone as repaint evidence.

normal:
No clear abnormal paint difference is visible in sufficiently comparable evidence.

attention:
Visible paint evidence suggests possible repainting or touch-up.

unsure:
Lighting, reflection, angle, exposure, or image quality prevents reliable paint assessment.

==================================================
ITEM: intake_manifold_condition
==================================================

Purpose:
Inspect only the visibly captured intake-manifold area and its visible fasteners/joints.

Look for:
- visible cracks
- visible surface damage
- visible tool marks
- visibly damaged fasteners

Do NOT infer:
- air leakage
- vacuum leakage
- fuel-mixture condition
- engine performance

normal:
Relevant visible intake-manifold areas are sufficiently clear and no obvious visual abnormality is found.

attention:
A clear visible exterior abnormality is present.

unsure:
The intake manifold, joint, or relevant fasteners are not sufficiently visible.

==================================================
ITEM: engine_guard_condition
==================================================

Purpose:
Inspect visible engine guard / engine protection plate if such a component is present.

Look for:
- scratches
- cracks
- deformation
- fastener damage
- visible surface damage

Do NOT infer:
- why the guard was installed
- accident history
- prior fall history

normal:
A relevant guard is present, sufficiently visible, and no obvious visual abnormality is found.

attention:
A relevant guard is present and a clear visible abnormality is found.

unsure:
A relevant guard appears to be present but cannot be inspected reliably.

not_applicable:
No applicable engine guard / protection plate is present for this item.

==================================================
ITEM: chain_sprocket_condition
==================================================

Purpose:
Inspect only the visually observable condition of an exposed motorcycle chain and sprocket.

This item applies only when an exposed chain-and-sprocket system is present.

Look for:
- visible chain rust
- visible chain surface damage
- visibly abnormal chain links
- visible sprocket rust
- visibly abnormal sprocket tooth shape
- visible sprocket damage
- obvious foreign material
- other clear visible abnormalities in the chain/sprocket area

Do NOT:
- estimate chain slack
- estimate chain elongation
- estimate remaining chain life
- estimate remaining sprocket life
- predict remaining mileage
- infer chain noise
- infer gearbox condition
- infer clutch condition
- inspect CVT internals
- inspect drive-belt condition

normal:
Relevant chain and sprocket areas are sufficiently clear and no obvious visual abnormality is found.

attention:
A clear visible chain or sprocket abnormality is present.

unsure:
Relevant chain or sprocket areas are not sufficiently visible.

not_applicable:
The vehicle does not have an exposed chain-and-sprocket system applicable to this inspection item.

==================================================
ITEM: exhaust_condition
==================================================

Purpose:
Inspect visually observable exhaust-system exterior condition.

Look for:
- rust
- dents
- cracks
- visible surface damage
- unusual residue around visible joints
- visual evidence that may warrant further checking of an exhaust joint

Do NOT infer:
- confirmed exhaust leakage
- exhaust efficiency
- catalytic-converter condition
- emissions-test outcome
- internal exhaust condition

normal:
Relevant visible exhaust surfaces and joints are sufficiently clear and no obvious visual abnormality is found.

attention:
A clear visible external abnormality is present.

For possible leak-related evidence:
describe only the visible residue / abnormality and recommend further checking.
Do not state that an exhaust leak is confirmed.

unsure:
Relevant exhaust areas are not sufficiently visible.

==================================================
GROUP RULES
==================================================

Evaluate each requested item independently.

Only return requestedItems.

Do not analyze engine sound.

Do not analyze vibration.

Do not analyze cold-start behavior.

Do not analyze hot-engine behavior.

Do not infer internal mechanical condition.

Do not infer repair history.

Do not infer accident history.

Do not diagnose a leak source from image-only evidence.

Use only evidence explicitly supplied in this request.`

export const GROUP_C_ITEM_IDS = [
  'engine_leak_condition',
  'engine_external_condition',
  'engine_tool_mark_condition',
  'engine_paint_condition',
  'intake_manifold_condition',
  'engine_guard_condition',
  'chain_sprocket_condition',
  'exhaust_condition',
] as const
export type GroupCItemId = (typeof GROUP_C_ITEM_IDS)[number]

export const GROUP_C_EVIDENCE_VIEWS = [
  'engine_left',
  'engine_right',
  'engine_bottom',
  'chain_sprocket',
  'exhaust',
] as const
export type GroupCEvidenceView = (typeof GROUP_C_EVIDENCE_VIEWS)[number]
