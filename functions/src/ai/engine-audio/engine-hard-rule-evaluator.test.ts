import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateHardRules } from './engine-hard-rule-evaluator'
import { PhaseAssessment } from './engine-phase-analyzer'
import { RecordingAssessment } from './audio-quality-analyzer'

/**
 * Fixture-driven coverage of spec §28's 12 test cases, at the level these
 * are actually deterministic: evaluateHardRules' job is exactly "never let
 * a confirmed failure look like normal" — none of these cases needs a real
 * recording or a Gemini call to verify (that's the whole point of pulling
 * these decisions out of the AI in the first place). Cases 8/11/12 are
 * about Gemini's own acoustic judgement (not attributing background noise
 * to the engine; describing engine type) and aren't hard-rule concerns —
 * they're not exercised here. Case 9 (mechanical tapping) is an
 * EngineEventDetector concern, not a Hard Rule — see
 * engine-event-detector.test.ts.
 */

const USABLE: RecordingAssessment = {
  usable: true,
  engineDetected: true,
  audioQuality: 'good',
  silenceRatio: 0.05,
  clippingRatio: 0,
  overallRms: 0.3,
  idleRmsCv: null,
  idleTooUnsteady: false,
  ambientMarginDb: null,
  ambientTooLoud: false,
}

const UNUSABLE: RecordingAssessment = {
  usable: false,
  engineDetected: false,
  audioQuality: 'unusable',
  silenceRatio: 0.95,
  clippingRatio: 0,
  overallRms: 0.01,
  idleRmsCv: null,
  idleTooUnsteady: false,
  ambientMarginDb: null,
  ambientTooLoud: false,
}

const CLEAN_PHASES: PhaseAssessment = {
  startup: {
    valid: true,
    starterDetected: true,
    engineStarted: true,
    sustainedRunningReached: true,
    multipleStartAttempts: false,
  },
  idle: { valid: true, enginePresentRatio: 0.95, stallDetected: false },
  rev: { valid: true, enginePresentRatio: 0.95, stallDetected: false, throttleChangeDetected: true },
}

test('CASE 1 — clean start/idle/rev: no hard rule forces anything, Gemini decides freely', () => {
  const verdicts = evaluateHardRules(USABLE, CLEAN_PHASES)
  assert.deepEqual(verdicts, {})
})

test('CASE 8 — engine clearly present throughout: background noise alone must not force a verdict', () => {
  // Same shape as CASE 1 — the point is that "audible background noise
  // exists" isn't itself a signal this evaluator even sees; only confirmed
  // phase-validity failures are. If phases are all valid, verdicts stay empty
  // regardless of how noisy the recording was.
  const verdicts = evaluateHardRules(USABLE, CLEAN_PHASES)
  assert.deepEqual(verdicts, {})
})

test('CASE 2 — no usable engine sound anywhere: all four items unsure, never normal', () => {
  const verdicts = evaluateHardRules(UNUSABLE, CLEAN_PHASES)
  for (const itemId of ['starter_motor_sound', 'start_smoothness', 'engine_idle_sound', 'engine_rev_sound'] as const) {
    assert.equal(verdicts[itemId]?.result, 'unsure')
    assert.equal(verdicts[itemId]?.label, 'no_engine_sound_detected')
  }
})

test('CASE 10 — severe clipping (quality gate fails): same no-engine treatment as CASE 2', () => {
  const clippedUnusable: RecordingAssessment = { ...UNUSABLE, clippingRatio: 0.5, silenceRatio: 0 }
  const verdicts = evaluateHardRules(clippedUnusable, CLEAN_PHASES)
  assert.equal(verdicts.starter_motor_sound?.result, 'unsure')
  assert.equal(verdicts.engine_rev_sound?.result, 'unsure')
})

test('CASE 3 — starter cranks but engine never starts: starter/smoothness attention, idle/rev unsure, never normal', () => {
  const failedStart: PhaseAssessment = {
    startup: {
      valid: false,
      starterDetected: true,
      engineStarted: false,
      sustainedRunningReached: false,
      multipleStartAttempts: false,
    },
    idle: { valid: false, enginePresentRatio: 0, stallDetected: false },
    rev: { valid: false, enginePresentRatio: 0, stallDetected: false, throttleChangeDetected: false },
  }
  const verdicts = evaluateHardRules(USABLE, failedStart)
  assert.equal(verdicts.starter_motor_sound?.result, 'attention')
  assert.equal(verdicts.start_smoothness?.result, 'attention')
  assert.equal(verdicts.engine_idle_sound?.result, 'unsure')
  assert.equal(verdicts.engine_rev_sound?.result, 'unsure')
  // Never normal for any of the four, per spec §13.
  for (const key of Object.keys(verdicts) as (keyof typeof verdicts)[]) {
    assert.notEqual(verdicts[key]?.result, 'normal')
  }
})

test('CASE 4 — two start attempts before success: starter/smoothness attention, idle/rev left to Gemini', () => {
  const twoAttempts: PhaseAssessment = {
    ...CLEAN_PHASES,
    startup: { ...CLEAN_PHASES.startup, multipleStartAttempts: true },
  }
  const verdicts = evaluateHardRules(USABLE, twoAttempts)
  assert.equal(verdicts.starter_motor_sound?.result, 'attention')
  assert.equal(verdicts.starter_motor_sound?.label, 'multiple_start_attempts')
  assert.equal(verdicts.start_smoothness?.result, 'attention')
  // Startup itself succeeded — idle/rev are NOT forced, Gemini judges them.
  assert.equal(verdicts.engine_idle_sound, undefined)
  assert.equal(verdicts.engine_rev_sound, undefined)
})

test('CASE 5 — idle stall: engine_idle_sound attention, NEVER normal', () => {
  const idleStall: PhaseAssessment = {
    ...CLEAN_PHASES,
    idle: { ...CLEAN_PHASES.idle, stallDetected: true },
  }
  const verdicts = evaluateHardRules(USABLE, idleStall)
  assert.equal(verdicts.engine_idle_sound?.result, 'attention')
  assert.equal(verdicts.engine_idle_sound?.label, 'engine_stall_during_idle')
})

test('CASE 6 — rev stall: engine_rev_sound attention', () => {
  const revStall: PhaseAssessment = {
    ...CLEAN_PHASES,
    rev: { ...CLEAN_PHASES.rev, stallDetected: true },
  }
  const verdicts = evaluateHardRules(USABLE, revStall)
  assert.equal(verdicts.engine_rev_sound?.result, 'attention')
  assert.equal(verdicts.engine_rev_sound?.label, 'engine_stall_during_rev')
})

test('CASE 7 — rev phase never throttled: engine_rev_sound unsure, NEVER normal', () => {
  const noRev: PhaseAssessment = {
    ...CLEAN_PHASES,
    rev: { ...CLEAN_PHASES.rev, throttleChangeDetected: false },
  }
  const verdicts = evaluateHardRules(USABLE, noRev)
  assert.equal(verdicts.engine_rev_sound?.result, 'unsure')
  assert.equal(verdicts.engine_rev_sound?.label, 'rev_action_not_detected')
})

test('rev stall takes priority over rev-not-performed when both conditions are present', () => {
  const stalledAndNoThrottle: PhaseAssessment = {
    ...CLEAN_PHASES,
    rev: { ...CLEAN_PHASES.rev, stallDetected: true, throttleChangeDetected: false },
  }
  const verdicts = evaluateHardRules(USABLE, stalledAndNoThrottle)
  assert.equal(verdicts.engine_rev_sound?.label, 'engine_stall_during_rev')
})
