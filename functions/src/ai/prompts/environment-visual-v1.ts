export const ENVIRONMENT_VISUAL_PROMPT_VERSION = 'environment-visual-v1'

export const ENVIRONMENT_VISUAL_PROMPT = `You are the MotoVerify vehicle-inspection environment analysis engine.

Analyze only the inspection environment.

Evaluate:
- indoor or outdoor
- lighting suitability
- lighting uniformity
- backlight risk
- reflection risk
- shadow risk
- available space
- obstruction risk
- moving people/vehicle interference

Do NOT:
- inspect motorcycle condition
- inspect motorcycle paint condition
- infer accident history
- identify people

Use "unknown" when evidence is insufficient.

Return structured JSON only.`

export const ENVIRONMENT_VISUAL_SCHEMA = {
  type: 'object',
  properties: {
    environmentType: { type: 'string', enum: ['indoor', 'outdoor', 'unknown'] },
    lightingSuitability: { type: 'string', enum: ['good', 'moderate', 'poor', 'unknown'] },
    lightingUniformity: { type: 'string', enum: ['uniform', 'moderate', 'uneven', 'unknown'] },
    backlightRisk: { type: 'string', enum: ['low', 'moderate', 'high', 'unknown'] },
    reflectionRisk: { type: 'string', enum: ['low', 'moderate', 'high', 'unknown'] },
    shadowRisk: { type: 'string', enum: ['low', 'moderate', 'high', 'unknown'] },
    spaceAvailability: { type: 'string', enum: ['good', 'limited', 'unknown'] },
    obstructionRisk: { type: 'string', enum: ['low', 'moderate', 'high', 'unknown'] },
    movingObjectInterference: { type: 'string', enum: ['low', 'moderate', 'high', 'unknown'] },
    note: { type: ['string', 'null'] },
  },
  required: [
    'environmentType',
    'lightingSuitability',
    'lightingUniformity',
    'backlightRisk',
    'reflectionRisk',
    'shadowRisk',
    'spaceAvailability',
    'obstructionRisk',
    'movingObjectInterference',
    'note',
  ],
}

export interface EnvironmentVisualResult {
  environmentType: 'indoor' | 'outdoor' | 'unknown'
  lightingSuitability: 'good' | 'moderate' | 'poor' | 'unknown'
  lightingUniformity: 'uniform' | 'moderate' | 'uneven' | 'unknown'
  backlightRisk: 'low' | 'moderate' | 'high' | 'unknown'
  reflectionRisk: 'low' | 'moderate' | 'high' | 'unknown'
  shadowRisk: 'low' | 'moderate' | 'high' | 'unknown'
  spaceAvailability: 'good' | 'limited' | 'unknown'
  obstructionRisk: 'low' | 'moderate' | 'high' | 'unknown'
  movingObjectInterference: 'low' | 'moderate' | 'high' | 'unknown'
  note: string | null
}
