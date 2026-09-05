/** Only 4 retry templates for Group B's 7 items — front/rear share one
 *  template parameterized by position (spec §29-32: "只有 4 種 Retry Prompt
 *  Template。不要建立 7 份內容幾乎一樣的 Prompt"). */
export const TIRE_CONDITION_RETRY_VERSION = 'tire-condition-v1'
export function tireConditionRetryPrompt(position: 'front' | 'rear'): string {
  return `ITEM: ${position}_tire_condition

This is the second and final visual inspection attempt.

Evaluate ONLY the ${position} tire.

Look for:
- cracks
- cuts
- bulges
- foreign objects
- obvious uneven wear
- obvious center or side wear
- visible surface damage

Do NOT:
- estimate tread depth in millimeters
- estimate remaining life
- estimate remaining mileage
- determine legal compliance

If the relevant tire surfaces are now sufficiently visible:
return normal or attention.

If they remain insufficiently visible:
return unsure.

Do not request another retake.`
}

export const SUSPENSION_CONDITION_RETRY_VERSION = 'suspension-condition-v1'
export function suspensionConditionRetryPrompt(position: 'front' | 'rear'): string {
  return `ITEM: ${position}_suspension_condition

This is the second and final visual inspection attempt.

Evaluate ONLY the visible exterior condition of the ${position} suspension.

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
}

export const BRAKE_CONDITION_RETRY_VERSION = 'brake-condition-v1'
export function brakeConditionRetryPrompt(position: 'front' | 'rear'): string {
  return `ITEM: ${position}_brake_condition

This is the second and final visual inspection attempt.

Evaluate ONLY externally visible brake-component condition.

Look for:
- rust
- obvious grooves
- surface damage
- contamination
- externally visible missing or damaged parts

Do NOT:
- estimate brake pad thickness
- estimate disc thickness
- infer braking force
- declare braking performance safe or unsafe

For a rear drum brake:
only inspect externally visible components.

If sufficient evidence is now available:
return normal or attention.

If evidence remains insufficient:
return unsure.

Do not request another retake.`
}

export const TRIPLE_CLAMP_RETRY_VERSION = 'triple-clamp-v1'
export const TRIPLE_CLAMP_RETRY_PROMPT = `ITEM: triple_clamp_condition

This is the second and final visual inspection attempt.

Evaluate ONLY visually observable triple-clamp and steering-stop exterior condition.

Look for:
- rust
- surface damage
- damaged fastener heads
- visible tool-contact marks
- obvious visible steering-stop damage

Do NOT infer:
- accident history
- frame damage
- confirmed disassembly
- steering geometry
- structural integrity

If sufficient evidence is now available:
return normal or attention.

If evidence remains insufficient:
return unsure.

Do not request another retake.`

export function groupBRetryFor(itemId: string): { version: string; prompt: string } {
  switch (itemId) {
    case 'front_tire_condition':
      return { version: TIRE_CONDITION_RETRY_VERSION, prompt: tireConditionRetryPrompt('front') }
    case 'rear_tire_condition':
      return { version: TIRE_CONDITION_RETRY_VERSION, prompt: tireConditionRetryPrompt('rear') }
    case 'front_suspension_condition':
      return {
        version: SUSPENSION_CONDITION_RETRY_VERSION,
        prompt: suspensionConditionRetryPrompt('front'),
      }
    case 'rear_suspension_condition':
      return {
        version: SUSPENSION_CONDITION_RETRY_VERSION,
        prompt: suspensionConditionRetryPrompt('rear'),
      }
    case 'front_brake_condition':
      return { version: BRAKE_CONDITION_RETRY_VERSION, prompt: brakeConditionRetryPrompt('front') }
    case 'rear_brake_condition':
      return { version: BRAKE_CONDITION_RETRY_VERSION, prompt: brakeConditionRetryPrompt('rear') }
    case 'triple_clamp_condition':
      return { version: TRIPLE_CLAMP_RETRY_VERSION, prompt: TRIPLE_CLAMP_RETRY_PROMPT }
    default:
      throw new Error(`No Group B retry template for itemId: ${itemId}`)
  }
}
