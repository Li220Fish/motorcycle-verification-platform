import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEngineAudioResults } from './engine-result-resolver'
import { GeminiItemResult } from '../schemas/common'

function geminiResult(itemId: string, result: GeminiItemResult['result'], label = 'normal_acoustic_pattern'): GeminiItemResult {
  return {
    itemId,
    result,
    confidence: 0.9,
    label,
    note: result === 'normal' ? null : 'gemini note',
    evidenceIds: [],
    problematicEvidenceIds: [],
    retakeInstruction: null,
  }
}

const ALL_NORMAL_GEMINI: GeminiItemResult[] = [
  geminiResult('starter_motor_sound', 'normal'),
  geminiResult('start_smoothness', 'normal'),
  geminiResult('engine_idle_sound', 'normal'),
  geminiResult('engine_rev_sound', 'normal'),
]

test('spec §25 example 1 — Hard Rule engine_stall_during_idle beats Gemini normal', () => {
  const resolved = resolveEngineAudioResults({
    hardRuleVerdicts: {
      engine_idle_sound: {
        result: 'attention',
        label: 'engine_stall_during_idle',
        note: '怠速熄火',
      },
    },
    geminiResults: ALL_NORMAL_GEMINI,
  })
  const idle = resolved.find((r) => r.itemId === 'engine_idle_sound')
  assert.equal(idle?.result, 'attention')
  assert.equal(idle?.hardRuleApplied, 'engine_stall_during_idle')
})

test('spec §25 example 2 — Hard Rule rev_action_not_detected beats Gemini normal (never normal)', () => {
  const resolved = resolveEngineAudioResults({
    hardRuleVerdicts: {
      engine_rev_sound: {
        result: 'unsure',
        label: 'rev_action_not_detected',
        note: '未拉轉',
      },
    },
    geminiResults: ALL_NORMAL_GEMINI,
  })
  const rev = resolved.find((r) => r.itemId === 'engine_rev_sound')
  assert.equal(rev?.result, 'unsure')
  assert.notEqual(rev?.result, 'normal')
  assert.equal(rev?.hardRuleApplied, 'rev_action_not_detected')
})

test('with no Hard Rule verdicts at all, every item falls through to Gemini\'s own result', () => {
  const resolved = resolveEngineAudioResults({ hardRuleVerdicts: {}, geminiResults: ALL_NORMAL_GEMINI })
  for (const item of resolved) {
    assert.equal(item.result, 'normal')
    assert.equal(item.hardRuleApplied, null)
  }
})

test('a Hard Rule verdict for only ONE item leaves the other three on Gemini\'s verdict', () => {
  const resolved = resolveEngineAudioResults({
    hardRuleVerdicts: {
      starter_motor_sound: { result: 'attention', label: 'multiple_start_attempts', note: '兩次啟動' },
    },
    geminiResults: ALL_NORMAL_GEMINI,
  })
  assert.equal(resolved.find((r) => r.itemId === 'starter_motor_sound')?.result, 'attention')
  assert.equal(resolved.find((r) => r.itemId === 'start_smoothness')?.result, 'normal')
  assert.equal(resolved.find((r) => r.itemId === 'engine_idle_sound')?.result, 'normal')
  assert.equal(resolved.find((r) => r.itemId === 'engine_rev_sound')?.result, 'normal')
})

test('a not_applicable Gemini result is defensively treated as unsure, never surfaced as-is', () => {
  const resolved = resolveEngineAudioResults({
    hardRuleVerdicts: {},
    geminiResults: [
      geminiResult('starter_motor_sound', 'not_applicable'),
      ...ALL_NORMAL_GEMINI.slice(1),
    ],
  })
  assert.equal(resolved.find((r) => r.itemId === 'starter_motor_sound')?.result, 'unsure')
})
