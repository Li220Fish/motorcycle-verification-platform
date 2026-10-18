/**
 * English overlay for the verification checklist's own body text
 * (src/data/verification/*.ts) — description / instruction / helpText /
 * lockedHint / evidence labels / answer options, keyed by the item's stable
 * id. Same non-breaking idea as `itemLabels` + useI18n's tItem(): the data
 * layer stays Chinese (the admin backend reads it too), and English mode
 * looks each field up here, falling back to the Chinese original.
 */
export interface ItemTextEn {
  description?: string
  instruction?: string
  helpText?: string
  lockedHint?: string
  evidence?: string[]
  options?: Record<string, string>
}

const BASIC_DESC =
  'Basic 12-Point Check: tap the marker on the vehicle photo to quickly mark ✓ (normal) or ✗ (issue).'
const OWNER_NOTE = 'Supplementary info from the owner — not a core AI-judged item.'
const CONDITIONAL = 'Conditional: only needed if the previous answer was "Yes" or "Unsure".'
const SHOOT_ISSUE = ['Photograph the abnormal area']

export const ITEM_TEXTS_EN: Record<string, ItemTextEn> = {
  // Section cards (Hub) — `description` holds the section's shortDescription.
  'seller-phase1-core': {
    description: 'Photos of key vehicle areas — analyzed automatically by AI.',
  },
  'seller-phase2-basic-health': {
    description:
      'Tap markers on the vehicle photo to quickly mark body and lighting/electrical basics.',
  },
  'seller-phase3-engine': {
    description:
      'Cold-engine check, then a single 23-second start + idle + throttle recording — done in order.',
  },
  'seller-phase4-disclosure': {
    description: 'Supplementary info from the owner — not core AI checks; all can be skipped.',
  },
  'buyer-ride': { description: 'Do the standard road-test procedure.' },
  'buyer-hot-check': {
    description: 'After the ride, re-check leaks, running sound and stability — done in order.',
  },
  'APR-left-side': {
    description:
      'Shoot the full left side. AI checks: scratches, cracks, dents, suspected touch-up paint, color mismatch, obvious modifications, body asymmetry.',
    instruction: 'Shoot: left side of the vehicle',
    helpText: 'One photo produces several results.',
    evidence: ['Left side of the vehicle'],
  },
  'APR-right-side': {
    description:
      'Shoot the full right side. AI checks: scratches, cracks, dents, suspected touch-up paint, color mismatch, obvious modifications, body asymmetry.',
    instruction: 'Shoot: right side of the vehicle',
    helpText: 'Analyzed together with the left side.',
    evidence: ['Right side of the vehicle'],
  },
  'APR-dashboard': {
    description:
      'Shoot with the ignition on. AI checks: display condition, screen appearance, odometer reading, recognizable warning lights.',
    instruction: 'Turn the ignition on first, then shoot the dashboard',
    helpText: 'Only the dashboard.',
    evidence: ['Dashboard'],
  },
  'APR-rear': {
    description:
      'AI checks: scratches, cracks, damage, obvious left/right asymmetry and other visible issues.',
    instruction: 'Shoot: rear of the vehicle',
    evidence: ['Rear'],
  },
  'APR-front-suspension-left': {
    description:
      'AI checks: oil leaks, rust, scratches, unusual repainting and other visible issues.',
    instruction: 'Shoot: left front suspension',
    evidence: ['Left front suspension'],
  },
  'APR-front-suspension-right': {
    description:
      'AI checks: oil leaks, rust, scratches, unusual repainting and other visible issues.',
    instruction: 'Shoot: right front suspension',
    evidence: ['Right front suspension'],
  },
  'APR-engine-bottom': {
    description: 'AI checks: oil/fluid seepage, scratches, guards and other visible issues.',
    instruction: 'Shoot: engine underside',
    evidence: ['Engine underside'],
  },
  'APR-transmission-chain': {
    description:
      'AI checks: visible rust, abnormal wear, signs of removal and other visible issues.',
    instruction: 'Shoot: drivetrain / chain area',
    helpText:
      'Only needed for vehicles with an exposed chain; scooters and other vehicles without one are automatically marked N/A. The photo does not judge noises.',
    evidence: ['Drivetrain / chain area'],
  },
  'BASIC-headlight': { description: BASIC_DESC },
  'BASIC-turnsignal': { description: BASIC_DESC },
  'BASIC-taillight': { description: BASIC_DESC },
  'BASIC-seat': { description: BASIC_DESC },
  'BASIC-othermod': {
    description:
      'Basic 12-Point Check: tap the marker on the vehicle photo to mark it, and add a note about modifications.',
  },
  'BASIC-triple': { description: BASIC_DESC },
  'BASIC-frontshock': { description: BASIC_DESC },
  'BASIC-frontbrake': { description: BASIC_DESC },
  'BASIC-fronttire': { description: BASIC_DESC },
  'BASIC-rearbrake': { description: BASIC_DESC },
  'BASIC-reartire': { description: BASIC_DESC },
  'BASIC-rearshock': { description: BASIC_DESC },
  'BASIC-chain': { description: BASIC_DESC },
  'ENG-02': {
    description:
      'Touch a reference spot on the outside of the engine for a timed 5 seconds to confirm this is a cold-engine capture (judged by AI, not the owner’s own sense of temperature).',
    instruction:
      'Aim at the reference spot on the engine and touch it for the full 5-second countdown',
    lockedHint: 'Finish the cold-engine check first — it can’t be done after starting the engine.',
    evidence: ['5-second cold touch'],
  },
  'ENG-03': {
    description: 'Record to check whether the starter motor sounds normal.',
    instruction: 'Start recording when you press the starter',
    helpText: 'Can be recorded together with "Start-up smoothness".',
    lockedHint: 'Finish the start-up recording first — it can’t be re-recorded after shutting off.',
    evidence: ['Starter motor sound'],
  },
  'ENG-04': {
    description: 'Observe start-up smoothness: does it fire right away, or need throttle?',
    instruction: 'Record while starting',
    helpText: 'Can be recorded together with "Starter motor sound".',
    lockedHint: 'Finish the start-up recording before continuing.',
    evidence: ['Start-up process'],
  },
  'ENG-05': {
    description:
      'At idle, listen for irregular metallic knocking — e.g. valve-clearance ticking or cam-chain noise.',
    instruction: 'Record 15 seconds at idle',
    helpText: 'Can be recorded together with "Running sound while revving".',
    lockedHint: 'Finish the idle sound recording before continuing.',
    evidence: ['Idle running sound'],
  },
  'ENG-06': {
    description: 'Rev the throttle and listen for abnormal noises.',
    instruction: 'Record 10 seconds while revving',
    helpText: 'Can be recorded together with "Engine running sound".',
    lockedHint: 'Finish the revving sound recording before continuing.',
    evidence: ['Running sound while revving'],
  },
  'ENG-07': {
    description: 'Is engine vibration steady at idle?',
    instruction: 'Lay the phone flat on the footboard or use a phone mount',
    lockedHint: 'Finish collecting vibration data before continuing.',
    evidence: ['Idle vibration data'],
  },
  'ENG-08': {
    description: 'Is vibration steady while revving?',
    instruction: 'Lay the phone flat on the footboard or use a phone mount',
    lockedHint: 'Finish collecting vibration data before continuing.',
    evidence: ['Revving vibration data'],
  },
  'PREP-01': {
    description: `Check the service history. ${OWNER_NOTE}`,
    instruction: 'Photograph or upload service records',
    evidence: ['Service record'],
  },
  'PREP-02': {
    description: `The owner discloses whether the vehicle has had any of the following (select all that apply). ${OWNER_NOTE}`,
    helpText: 'Owner disclosure — the owner selects any of the above that apply and adds details.',
    options: { rollover: 'Tip-over', collision: 'Collision', other: 'Other', none: 'None' },
  },
  'PREP-02-DAMAGE-PHOTOS': {
    description: `Photograph where the collision or other damage is — multiple photos allowed. ${OWNER_NOTE}`,
    helpText:
      'Owner disclosure — photos of the actual location for whatever was selected in PREP-02.',
  },
  'PREP-04': {
    description: 'Make sure the Voltage Probe is connected over Bluetooth (advanced, optional).',
    helpText: 'If this verification needs the Probe / dedicated hardware.',
    evidence: ['Probe connection status'],
  },
  'ELEC-10': {
    description: `Has the electrical system had accessories added or modified? ${OWNER_NOTE}`,
    options: { normal: 'No', attention: 'Yes', unsure: 'Unsure' },
  },
  'ELEC-11': {
    description: `Is wiring messy, abnormally twisted, or held with lots of cable ties / odd fixings? ${OWNER_NOTE}`,
    helpText: CONDITIONAL,
    evidence: ['Photograph the abnormal wiring'],
  },
  'ELEC-12': {
    description: `Any splices, burn marks, re-wrapping or other abnormal signs? ${OWNER_NOTE}`,
    helpText: CONDITIONAL,
    evidence: ['Photograph the main harness'],
  },
  'ELEC-13': {
    description: `Where do added accessories draw power: 1. directly from the battery 2. ignition positive 3. fuse box 4. other. ${OWNER_NOTE}`,
    helpText: CONDITIONAL,
    evidence: ['Photograph the power tap'],
  },
  'ENG-01': {
    description: `Is the engine unusually clean, covered in sludge, or uneven? ${OWNER_NOTE}`,
    evidence: SHOOT_ISSUE,
  },
  'RIDE-01': { description: 'Do the standard road-test procedure.' },
  'HOT-01': { description: 'Any leaks?', evidence: SHOOT_ISSUE },
  'HOT-02': { description: 'Any leaks?', evidence: SHOOT_ISSUE },
  'HOT-03': { description: 'Any leaks?', evidence: SHOOT_ISSUE },
  'HOT-04': {
    description: 'With the engine warm, listen at idle for irregular metallic knocking.',
    instruction: 'Record',
    helpText: 'Can be paired with "Running sound while revving".',
    lockedHint: 'Finish the warm idle sound recording before continuing.',
    evidence: ['Warm idle running sound'],
  },
  'HOT-05': {
    description: 'With the engine warm, rev the throttle and listen for abnormal noises.',
    instruction: 'Record',
    helpText: 'Can be paired with "Engine running sound".',
    lockedHint: 'Finish the warm revving sound recording before continuing.',
    evidence: ['Warm running sound while revving'],
  },
  'HOT-06': {
    description: 'With the engine warm, is idle vibration steady?',
    instruction: 'Phone flat on the footboard / phone mount',
    lockedHint: 'Finish collecting vibration data before continuing.',
    evidence: ['Warm idle vibration data'],
  },
  'HOT-07': {
    description: 'With the engine warm, is vibration steady while revving?',
    instruction: 'Phone flat on the footboard / phone mount',
    lockedHint: 'Finish collecting vibration data before continuing.',
    evidence: ['Warm revving vibration data'],
  },
}
