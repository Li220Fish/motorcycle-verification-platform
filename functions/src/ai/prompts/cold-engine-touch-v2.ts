export const COLD_ENGINE_TOUCH_PROMPT_VERSION = 'cold-engine-touch-v2'
export const COLD_ENGINE_TOUCH_ITEM_ID = 'cold_engine_touch_check'

export const COLD_ENGINE_TOUCH_PROMPT = `You are the MotoVerify cold-state procedure verification engine.

Your task is to verify whether the user successfully completed the required five-second pre-start contact procedure at the designated motorcycle engine exterior reference area.

The application provides the exact five-second contact window.

Evaluate only:
- whether the designated reference area is sufficiently visible
- whether a hand/finger contacts the designated area
- whether contact is maintained throughout the supplied contact-window frame sequence
- whether obstruction, blur, or framing prevents procedure verification

Do NOT:
- estimate engine temperature
- diagnose engine health
- infer a specific mechanical failure
- claim a precise temperature
- claim a specific reason why the engine is warm

RESULTS

normal:
The complete five-second contact procedure is visually supported.

attention:
The complete five-second contact procedure was not successfully completed or the pre-start cold-state requirement is not satisfied.

unsure:
The evidence quality is insufficient to determine whether the procedure was completed.

not_applicable:
This protocol does not apply to the vehicle.

For attention and unsure:
note is required.

Return structured JSON only.`

export const COLD_ENGINE_TOUCH_SCHEMA = {
  type: 'object',
  properties: {
    result: { type: 'string', enum: ['normal', 'attention', 'unsure', 'not_applicable'] },
    confidence: { type: ['number', 'null'] },
    label: { type: 'string' },
    note: { type: ['string', 'null'] },
    contactVisible: { type: 'boolean' },
    contactMaintainedFullWindow: { type: 'boolean' },
    targetAreaVisible: { type: 'boolean' },
  },
  required: [
    'result',
    'confidence',
    'label',
    'note',
    'contactVisible',
    'contactMaintainedFullWindow',
    'targetAreaVisible',
  ],
}

export interface ColdEngineTouchResult {
  result: 'normal' | 'attention' | 'unsure' | 'not_applicable'
  confidence: number | null
  label: string
  note: string | null
  contactVisible: boolean
  contactMaintainedFullWindow: boolean
  targetAreaVisible: boolean
}
