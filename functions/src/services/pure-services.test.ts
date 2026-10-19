import { test } from 'node:test'
import assert from 'node:assert/strict'

import { validateGeminiResults } from '../ai/validator'
import { InvalidAiResponseError, type GeminiItemResult } from '../ai/schemas/common'
import { buildEngineAudioSchema, buildResultsSchema } from '../ai/schemas/schema-builder'
import { buildCacheKey, hashContent } from '../ai/gemini/cache'
import { AI_PROMPT_MAP, AI_PROMPT_REGISTRY } from '../ai/prompts/registry'
import { EVIDENCE_VIEW_MAP, itemIdForView, viewForItemId } from './evidence-view-map'
import { buildImageRequestContext, buildKnownIssuesBlock } from './request-context'
import { maskUserId } from './transfer-party.service'
import { isAdminUid } from './auth.service'
import { hashPromptText } from './prompt-config.service'
import { assertRetryEligible } from './answer-writer.service'
import { SCORE_CONFIG } from './score.config'

function item(overrides: Partial<GeminiItemResult> = {}): GeminiItemResult {
  return {
    itemId: 'a',
    result: 'normal',
    confidence: 0.9,
    label: 'ok',
    note: null,
    evidenceIds: ['e1'],
    problematicEvidenceIds: [],
    retakeInstruction: null,
    ...overrides,
  }
}
const opts = (overrides = {}) => ({
  requestedItemIds: ['a'],
  attempt: 1 as const,
  validEvidenceIds: new Set(['e1']),
  ...overrides,
})

test('validateGeminiResults accepts a well-formed response', () => {
  validateGeminiResults([item()], opts())
  validateGeminiResults([item({ result: 'attention', note: '刮傷' })], opts())
  validateGeminiResults(
    [item({ result: 'unsure', note: '太暗', retakeInstruction: '開燈重拍' })],
    opts(),
  )
  validateGeminiResults([item({ result: 'unsure', note: '太暗' })], opts({ attempt: 2 }))
})

test('validateGeminiResults rejects every rule violation', () => {
  const bad: [GeminiItemResult[], object, RegExp][] = [
    [[item({ itemId: 'zzz' })], opts(), /Unknown itemId/],
    [[item(), item()], opts(), /Duplicate itemId/],
    [[item({ result: 'cannot_check' as never })], opts(), /Invalid result enum/],
    [[item({ result: 'attention', note: '  ' })], opts(), /requires a note/],
    [[item({ result: 'unsure', note: 'x' })], opts(), /requires retakeInstruction/],
    [
      [item({ result: 'unsure', note: 'x', retakeInstruction: 'y' })],
      opts({ attempt: 2 }),
      /must not include retakeInstruction/,
    ],
    [[item({ evidenceIds: ['other-verification'] })], opts(), /not part of this request/],
    [[item({ problematicEvidenceIds: ['nope'] })], opts(), /problematicEvidenceId/],
    [[], opts(), /Missing result/],
  ]
  for (const [results, options, message] of bad) {
    assert.throws(
      () => validateGeminiResults(results, options as never),
      (err: Error) => err instanceof InvalidAiResponseError && message.test(err.message),
    )
  }
  assert.throws(() => validateGeminiResults('nope' as never, opts()), InvalidAiResponseError)
})

test('result schema enumerates the requested items; audio schema adds engine type fields', () => {
  const schema = buildResultsSchema(['x', 'y']) as {
    properties: { results: { items: { properties: { itemId: { enum: string[] } } } } }
    required: string[]
  }
  assert.deepEqual(schema.properties.results.items.properties.itemId.enum, ['x', 'y'])
  assert.deepEqual(schema.required, ['results'])
  const audio = buildEngineAudioSchema(['x']) as {
    required: string[]
    properties: Record<string, unknown>
  }
  assert.deepEqual(audio.required, ['results', 'engineTypeNote', 'engineTypeConfidence'])
  assert.ok('engineTypeNote' in audio.properties)
})

test('cache key is order-insensitive and changes with prompt/model', () => {
  const base = {
    contentHashes: ['h1', 'h2'],
    requestedItemIds: ['a', 'b'],
    promptVersion: 'p1',
    model: 'm1',
  }
  const key = buildCacheKey(base)
  assert.equal(
    key,
    buildCacheKey({ ...base, contentHashes: ['h2', 'h1'], requestedItemIds: ['b', 'a'] }),
  )
  assert.notEqual(key, buildCacheKey({ ...base, promptVersion: 'p2' }))
  assert.notEqual(key, buildCacheKey({ ...base, model: 'm2' }))
  assert.equal(hashContent('abc'), hashContent('abc'))
  assert.match(hashContent('abc'), /^[0-9a-f]{64}$/)
  assert.equal(hashPromptText('x').length, 12)
  assert.notEqual(hashPromptText('x'), hashPromptText('y'))
})

test('prompt registry: unique keys, non-empty texts, map mirrors the list', () => {
  const keys = AI_PROMPT_REGISTRY.map((p) => p.key)
  assert.equal(new Set(keys).size, keys.length)
  for (const p of AI_PROMPT_REGISTRY) {
    assert.ok(p.label.trim(), p.key)
    assert.ok(p.defaultText.trim().length > 50, p.key)
    assert.equal(AI_PROMPT_MAP.get(p.key), p)
  }
  for (const key of [
    'global-inspection-v2',
    'core-vision-sides-v1',
    'core-vision-rear-v1',
    'core-vision-front-suspension-v1',
    'core-vision-engine-bottom-v1',
    'dashboard-ocr-v2',
  ])
    assert.ok(AI_PROMPT_MAP.has(key), key)
})

test('evidence view map round-trips', () => {
  for (const [itemId, view] of Object.entries(EVIDENCE_VIEW_MAP)) {
    assert.equal(viewForItemId(itemId), view)
    assert.equal(itemIdForView(view), itemId)
  }
  assert.equal(
    new Set(Object.values(EVIDENCE_VIEW_MAP)).size,
    Object.keys(EVIDENCE_VIEW_MAP).length,
  )
  assert.equal(viewForItemId('nope'), undefined)
  assert.equal(itemIdForView('nope'), undefined)
})

test('known issues block is framed as reference-only; empty → nothing', () => {
  assert.deepEqual(buildKnownIssuesBlock([]), [])
  const block = buildKnownIssuesBlock(['排氣管易鏽'])
  assert.ok(block[0].includes('reference only'))
  assert.ok(block.includes('- 排氣管易鏽'))
  assert.ok(block[block.length - 1].includes('NOT confirmed'))
})

test('image request context lists evidence + items, optional blocks only when present', () => {
  const images = [{ evidenceId: 'e1', view: 'vehicle_rear' }] as never
  const plain = buildImageRequestContext({
    group: 'rear',
    attempt: 1,
    images,
    requestedItemIds: ['body_damage_rear'],
  })
  assert.ok(plain.includes('e1 = vehicle_rear'))
  assert.ok(plain.includes('body_damage_rear'))
  assert.ok(!plain.includes('Vehicle context'))
  const full = buildImageRequestContext({
    group: 'rear',
    attempt: 2,
    images,
    requestedItemIds: ['x'],
    vehicleContextLines: ['transmission: manual'],
    knownIssuesLines: buildKnownIssuesBlock(['尾燈易進水']),
  })
  assert.ok(full.includes('attempt: 2'))
  assert.ok(full.includes('Vehicle context:\ntransmission: manual'))
  assert.ok(full.includes('- 尾燈易進水'))
})

test('maskUserId hides the middle of the uid', () => {
  assert.equal(maskUserId('Ab12CdEfGhIjKlMn34'), 'Ab12******Mn34')
  assert.equal(maskUserId('abcdefgh'), 'ab****gh')
  assert.equal(maskUserId('abc'), 'ab****bc')
  const uid = 'CMWrmo2pHsRiBu5kMj1CDJ23xd72'
  assert.ok(!maskUserId(uid).includes(uid.slice(4, -4)))
})

test('isAdminUid matches only the hardcoded admin', () => {
  assert.equal(isAdminUid('CMWrmo2pHsRiBu5kMj1CDJ23xd72'), true)
  assert.equal(isAdminUid('someone'), false)
  assert.equal(isAdminUid(undefined), false)
})

test('retry eligibility: only an attempt-1 unsure answer may retry', () => {
  assert.throws(() => assertRetryEligible(null), /only allowed while the current result is unsure/)
  assert.throws(() => assertRetryEligible({ itemId: 'a', result: 'normal' }), /only allowed/)
  assertRetryEligible({ itemId: 'a', result: 'unsure' })
  assertRetryEligible({
    itemId: 'a',
    result: 'unsure',
    aiResult: { details: { finalAttempt: 1 } } as never,
  })
  assert.throws(
    () =>
      assertRetryEligible({
        itemId: 'a',
        result: 'unsure',
        aiResult: { details: { finalAttempt: 2 } } as never,
      }),
    /Maximum retry/,
  )
})

test('score rules: a missed disclosure costs more than a match earns; kept appointment is small', () => {
  assert.ok(SCORE_CONFIG.disclosureMissDelta < 0)
  assert.ok(Math.abs(SCORE_CONFIG.disclosureMissDelta) > SCORE_CONFIG.disclosureMatchDelta)
  assert.ok(SCORE_CONFIG.appointmentKeptDelta > 0)
  assert.ok(SCORE_CONFIG.appointmentKeptDelta < SCORE_CONFIG.disclosureMatchDelta)
})
