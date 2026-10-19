import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildChatContents,
  MAX_IMAGE_BASE64_TOTAL,
  MAX_TEXT_CHARS,
  MAX_TURNS,
  resolveStorageImages,
} from './ask-ai-assistant'

const img = (size = 10) => ({ base64: 'a'.repeat(size), mimeType: 'image/jpeg' })

test('passes the user text and photo through as-is, no added prompt', () => {
  const contents = buildChatContents({
    turns: [{ role: 'user', text: '這是刮傷嗎？', image: img() }],
  })
  assert.deepEqual(contents, [
    {
      role: 'user',
      parts: [
        { inlineData: { data: 'aaaaaaaaaa', mimeType: 'image/jpeg' } },
        { text: '這是刮傷嗎？' },
      ],
    },
  ])
})

test('keeps the conversation history and roles', () => {
  const contents = buildChatContents({
    turns: [
      { role: 'user', text: 'q1' },
      { role: 'model', text: 'a1' },
      { role: 'user', text: 'q2' },
    ],
  })
  assert.deepEqual(
    contents.map((c) => [c.role, (c.parts[0] as { text: string }).text]),
    [
      ['user', 'q1'],
      ['model', 'a1'],
      ['user', 'q2'],
    ],
  )
})

test('photo-only messages are allowed', () => {
  const [turn] = buildChatContents({ turns: [{ role: 'user', text: '', image: img() }] })
  assert.equal(turn.parts.length, 1)
})

test('rejects empty, malformed, or model-last requests', () => {
  for (const data of [
    undefined,
    { turns: [] },
    { turns: [{ role: 'user', text: '  ' }] },
    {
      turns: [
        { role: 'user', text: 'q' },
        { role: 'model', text: 'a' },
      ],
    },
    {
      turns: [
        { role: 'system', text: 'x' },
        { role: 'user', text: 'q' },
      ],
    },
    { turns: [{ role: 'user', text: 'q', image: { base64: 'x', mimeType: 'application/pdf' } }] },
  ]) {
    assert.throws(
      () => buildChatContents(data),
      /invalid-argument|turns|Empty|Invalid|Unsupported|last turn/i,
    )
  }
})

test('trims long text and old turns', () => {
  const long = buildChatContents({
    turns: [{ role: 'user', text: 'x'.repeat(MAX_TEXT_CHARS + 500) }],
  })
  assert.equal((long[0].parts[0] as { text: string }).text.length, MAX_TEXT_CHARS)
  const many = Array.from({ length: MAX_TURNS + 6 }, (_, i) => ({
    role: i % 2 ? 'model' : 'user',
    text: `t${i}`,
  }))
  many.push({ role: 'user', text: 'last' })
  assert.equal(buildChatContents({ turns: many }).length, MAX_TURNS)
})

test('older images are dropped first to stay under the size budget; an oversized new image is rejected', () => {
  const half = Math.floor(MAX_IMAGE_BASE64_TOTAL * 0.6)
  const contents = buildChatContents({
    turns: [
      { role: 'user', text: 'old', image: img(half) },
      { role: 'model', text: 'ok' },
      { role: 'user', text: 'new', image: img(half) },
    ],
  })
  assert.equal(contents[0].parts.length, 1) // old image dropped, text kept
  assert.equal(contents[2].parts.length, 2) // newest image kept
  assert.throws(
    () =>
      buildChatContents({
        turns: [{ role: 'user', text: 'x', image: img(MAX_IMAGE_BASE64_TOTAL + 1) }],
      }),
    /too large/,
  )
})

test('storage evidence photos are resolved only after an ownership check', async () => {
  const checked: string[] = []
  const deps = {
    assertCanRead: async (verificationId: string) => {
      checked.push(verificationId)
      if (verificationId === 'someone-else') throw new Error('permission-denied')
    },
    download: async () => Buffer.from('jpeg-bytes'),
  }
  const data = {
    turns: [
      {
        role: 'user',
        text: '這是刮傷嗎？',
        image: { storagePath: 'verifications/v1/evidence/1-a.jpg' },
      },
    ],
  }
  const resolved = (await resolveStorageImages(data, 'u1', deps)) as {
    turns: { image: { base64: string } }[]
  }
  assert.equal(resolved.turns[0].image.base64, Buffer.from('jpeg-bytes').toString('base64'))
  assert.deepEqual(checked, ['v1'])
  assert.equal(buildChatContents(resolved)[0].parts.length, 2)

  await assert.rejects(
    resolveStorageImages(
      {
        turns: [
          {
            role: 'user',
            text: 'x',
            image: { storagePath: 'verifications/someone-else/evidence/a.jpg' },
          },
        ],
      },
      'u1',
      deps,
    ),
    /permission-denied/,
  )
  await assert.rejects(
    resolveStorageImages(
      { turns: [{ role: 'user', text: 'x', image: { storagePath: 'users/u2/avatar/a.jpg' } }] },
      'u1',
      deps,
    ),
    /Unsupported image path/,
  )
})
