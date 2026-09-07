export const COLD_ENGINE_TOUCH_PROMPT_VERSION = 'cold-engine-touch-v3'
export const COLD_ENGINE_TOUCH_ITEM_ID = 'cold_engine_touch_check'

/** Verification v2 migration spec §21 — supersedes cold-engine-touch-v2
 *  (kept in place for reference/history). Same result/schema contract as
 *  v2 (normal/attention/unsure + contactVisible/contactMaintainedFullWindow/
 *  targetAreaVisible — cold-touch.service.ts's coldStateValid stamping logic
 *  is unchanged, only the prompt wording moved to the v2 migration spec's
 *  text). */
export const COLD_ENGINE_TOUCH_PROMPT = `You are the MotoVerify cold-state procedure verification engine.

The supplied sequential frames come from a known five-second contact window recorded before engine startup.

Your task is to determine whether the required cold-state touch procedure was successfully completed.

Evaluate only:

- whether the designated engine exterior reference area is visible
- whether a hand or finger visibly contacts the designated area
- whether contact appears maintained throughout the supplied five-second frame sequence
- whether obstruction, blur, or framing prevents reliable verification

Do NOT:

- estimate engine temperature
- claim an exact temperature
- diagnose engine condition
- diagnose cooling-system condition
- identify mechanical failure
- identify motorcycle brand or model

RESULTS

normal:
The full five-second contact procedure is sufficiently supported by visual evidence.

attention:
The evidence clearly shows that the full required five-second contact procedure was not completed.

unsure:
The video evidence is insufficient to determine whether the procedure was completed.

For attention and unsure:
note is required.

The note field must be written in Traditional Chinese (繁體中文，台灣用語習慣) — never Simplified Chinese, never English, never a mix of languages. label stays a short English machine tag, unaffected by this rule.

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
