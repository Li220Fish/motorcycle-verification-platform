import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateHotEngineHardRules } from './engine-hard-rule-evaluator'
import { PhaseAssessment } from './engine-phase-analyzer'
import { RecordingAssessment } from './audio-quality-analyzer'

/**
 * 熱車檢查 counterpart to engine-hard-rule-evaluator.test.ts — same idle/rev
 * rules (§15-§17), but there is no startup phase at all in this pass (the
 * engine is already confirmed running — see engine-event-detector.ts's
 * `assumeAlreadyRunning`), so `phaseAssessment.startup` is irrelevant here
 * and every fixture below just carries whatever the real pipeline would
 * produce for it (all-false/zero, never read).
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

const IGNORED_STARTUP: PhaseAssessment['startup'] = {
  valid: false,
  starterDetected: false,
  engineStarted: false,
  sustainedRunningReached: true,
  multipleStartAttempts: false,
}

const CLEAN_PHASES: PhaseAssessment = {
  startup: IGNORED_STARTUP,
  idle: { valid: true, enginePresentRatio: 0.95, stallDetected: false },
  rev: { valid: true, enginePresentRatio: 0.95, stallDetected: false, throttleChangeDetected: true },
}

test('clean idle/rev: no hard rule forces anything, Gemini decides freely', () => {
  const verdicts = evaluateHotEngineHardRules(USABLE, CLEAN_PHASES)
  assert.deepEqual(verdicts, {})
})

test('no usable engine sound anywhere: both items unsure, never normal', () => {
  const verdicts = evaluateHotEngineHardRules(UNUSABLE, CLEAN_PHASES)
  for (const itemId of ['engine_idle_sound', 'engine_rev_sound'] as const) {
    assert.equal(verdicts[itemId]?.result, 'unsure')
    assert.equal(verdicts[itemId]?.label, 'no_engine_sound_detected')
  }
})

test('idle stall: engine_idle_sound attention, NEVER normal', () => {
  const idleStall: PhaseAssessment = {
    ...CLEAN_PHASES,
    idle: { ...CLEAN_PHASES.idle, stallDetected: true },
  }
  const verdicts = evaluateHotEngineHardRules(USABLE, idleStall)
  assert.equal(verdicts.engine_idle_sound?.result, 'attention')
  assert.equal(verdicts.engine_idle_sound?.label, 'engine_stall_during_idle')
})

test('rev stall: engine_rev_sound attention', () => {
  const revStall: PhaseAssessment = {
    ...CLEAN_PHASES,
    rev: { ...CLEAN_PHASES.rev, stallDetected: true },
  }
  const verdicts = evaluateHotEngineHardRules(USABLE, revStall)
  assert.equal(verdicts.engine_rev_sound?.result, 'attention')
  assert.equal(verdicts.engine_rev_sound?.label, 'engine_stall_during_rev')
})

test('rev phase never throttled: engine_rev_sound unsure, NEVER normal', () => {
  const noRev: PhaseAssessment = {
    ...CLEAN_PHASES,
    rev: { ...CLEAN_PHASES.rev, throttleChangeDetected: false },
  }
  const verdicts = evaluateHotEngineHardRules(USABLE, noRev)
  assert.equal(verdicts.engine_rev_sound?.result, 'unsure')
  assert.equal(verdicts.engine_rev_sound?.label, 'rev_action_not_detected')
})

test('rev stall takes priority over rev-not-performed when both conditions are present', () => {
  const stalledAndNoThrottle: PhaseAssessment = {
    ...CLEAN_PHASES,
    rev: { ...CLEAN_PHASES.rev, stallDetected: true, throttleChangeDetected: false },
  }
  const verdicts = evaluateHotEngineHardRules(USABLE, stalledAndNoThrottle)
  assert.equal(verdicts.engine_rev_sound?.label, 'engine_stall_during_rev')
})

test('starter_motor_sound/start_smoothness are never produced — no such item in this pass', () => {
  const verdicts = evaluateHotEngineHardRules(UNUSABLE, CLEAN_PHASES)
  assert.equal(Object.keys(verdicts).length, 2)
  assert.ok('engine_idle_sound' in verdicts)
  assert.ok('engine_rev_sound' in verdicts)
})
