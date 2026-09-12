export const CORE_VISION_ENGINE_BOTTOM_V1_PROMPT_VERSION = 'core-vision-engine-bottom-v1'

/** Verification v2 migration — one of 4 routes core-vision-v2.ts (deleted)
 * was split into, so this call fires as soon as the engine-bottom photo
 * exists without waiting on the other 3 groups. chain_sprocket_condition
 * keeps sharing this route (rather than getting its own 5th route) since
 * it's conditional (hasExposedChainSprocket) and photographed in the same
 * under-vehicle context as engine_bottom. */
export const CORE_VISION_ENGINE_BOTTOM_V1_PROMPT = `Analyze the supplied MotoVerify motorcycle engine-bottom / drivetrain inspection images.

Possible evidence views:

- engine_bottom
- chain_sprocket

Only analyze chain_sprocket_condition when chain_sprocket evidence is explicitly supplied.

Evaluate each requested item independently.

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

export const CORE_VISION_ENGINE_BOTTOM_V1_ITEM_IDS = [
  'engine_bottom_leak_condition',
  'engine_bottom_external_condition',
  'chain_sprocket_condition',
] as const
export type CoreVisionEngineBottomV1ItemId = (typeof CORE_VISION_ENGINE_BOTTOM_V1_ITEM_IDS)[number]

export const CORE_VISION_ENGINE_BOTTOM_V1_EVIDENCE_VIEWS = ['engine_bottom'] as const
