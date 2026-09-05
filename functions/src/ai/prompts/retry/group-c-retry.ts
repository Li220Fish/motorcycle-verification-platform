export const ENGINE_LEAK_RETRY_VERSION = 'engine-leak-v1'
export const ENGINE_LEAK_RETRY_PROMPT = `ITEM: engine_leak_condition

This is the second and final visual inspection attempt.

Evaluate ONLY possible visible external engine oil/fluid residue or leak-related evidence.

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

export const ENGINE_EXTERIOR_RETRY_VERSION = 'engine-exterior-v1'
export const ENGINE_EXTERIOR_RETRY_PROMPT = `ITEM: engine_external_condition

This is the second and final visual inspection attempt.

Evaluate ONLY visible engine exterior condition.

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

export const ENGINE_TOOL_MARK_RETRY_VERSION = 'engine-tool-mark-v1'
export const ENGINE_TOOL_MARK_RETRY_PROMPT = `ITEM: engine_tool_mark_condition

This is the second and final visual inspection attempt.

Evaluate ONLY visible fastener / bolt-head tool-contact evidence.

Look for:
- tool-contact marks
- fastener-head scratches
- damaged fastener edges

Do NOT infer:
- confirmed disassembly
- engine overhaul
- repair history

If relevant fasteners are sufficiently visible:
return normal or attention.

If they remain insufficiently visible:
return unsure.

Do not request another retake.`

export const ENGINE_PAINT_RETRY_VERSION = 'engine-paint-v1'
export const ENGINE_PAINT_RETRY_PROMPT = `ITEM: engine_paint_condition

This is the second and final visual inspection attempt.

Evaluate ONLY visible engine paint appearance.

Look for:
- color mismatch
- possible repaint evidence
- overspray
- abnormal paint boundaries
- texture differences

Do not treat lighting or reflection differences alone as repaint evidence.

Do NOT infer:
- repair date
- repair reason
- accident history

If evidence is sufficiently comparable:
return normal or attention.

If paint comparison remains unreliable:
return unsure.

Do not request another retake.`

export const INTAKE_MANIFOLD_RETRY_VERSION = 'intake-manifold-v1'
export const INTAKE_MANIFOLD_RETRY_PROMPT = `ITEM: intake_manifold_condition

This is the second and final visual inspection attempt.

Evaluate ONLY the visible intake-manifold area, joint, and relevant fasteners.

Look for:
- cracks
- surface damage
- tool-contact marks
- fastener damage

Do NOT infer:
- intake leakage
- vacuum leakage
- mixture condition
- engine performance

If the intake-manifold region is sufficiently visible:
return normal or attention.

If it remains insufficiently visible:
return unsure.

Do not request another retake.`

export const ENGINE_GUARD_RETRY_VERSION = 'engine-guard-v1'
export const ENGINE_GUARD_RETRY_PROMPT = `ITEM: engine_guard_condition

This is the second and final visual inspection attempt.

Evaluate ONLY the visible engine guard / protection plate if present.

Look for:
- scratches
- cracks
- deformation
- fastener damage
- visible surface damage

Do NOT infer why the guard was installed.

If an applicable guard is clearly present and sufficiently visible:
return normal or attention.

If an applicable guard appears present but remains unclear:
return unsure.

If no applicable guard exists:
return not_applicable.

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

export const EXHAUST_RETRY_VERSION = 'exhaust-v1'
export const EXHAUST_RETRY_PROMPT = `ITEM: exhaust_condition

This is the second and final visual inspection attempt.

Evaluate ONLY visible exhaust-system exterior condition.

Look for:
- rust
- dents
- cracks
- surface damage
- unusual residue around visible joints
- visible evidence warranting further checking of a joint

Do NOT infer:
- confirmed exhaust leakage
- exhaust performance
- catalytic-converter condition
- emissions-test outcome

If sufficient evidence is available:
return normal or attention.

If evidence remains insufficient:
return unsure.

Do not request another retake.`

export const GROUP_C_RETRY_PROMPTS: Record<string, { version: string; prompt: string }> = {
  engine_leak_condition: { version: ENGINE_LEAK_RETRY_VERSION, prompt: ENGINE_LEAK_RETRY_PROMPT },
  engine_external_condition: {
    version: ENGINE_EXTERIOR_RETRY_VERSION,
    prompt: ENGINE_EXTERIOR_RETRY_PROMPT,
  },
  engine_tool_mark_condition: {
    version: ENGINE_TOOL_MARK_RETRY_VERSION,
    prompt: ENGINE_TOOL_MARK_RETRY_PROMPT,
  },
  engine_paint_condition: {
    version: ENGINE_PAINT_RETRY_VERSION,
    prompt: ENGINE_PAINT_RETRY_PROMPT,
  },
  intake_manifold_condition: {
    version: INTAKE_MANIFOLD_RETRY_VERSION,
    prompt: INTAKE_MANIFOLD_RETRY_PROMPT,
  },
  engine_guard_condition: {
    version: ENGINE_GUARD_RETRY_VERSION,
    prompt: ENGINE_GUARD_RETRY_PROMPT,
  },
  chain_sprocket_condition: {
    version: CHAIN_SPROCKET_RETRY_VERSION,
    prompt: CHAIN_SPROCKET_RETRY_PROMPT,
  },
  exhaust_condition: { version: EXHAUST_RETRY_VERSION, prompt: EXHAUST_RETRY_PROMPT },
}
