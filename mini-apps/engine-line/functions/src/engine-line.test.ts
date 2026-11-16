import { strict as assert } from 'node:assert'
import * as crypto from 'node:crypto'
import { describe, it } from 'node:test'

import { analyzeCheck, classifyImu, overallOf } from './checks/analyze-check'
import { resultMessage, resultSummaryText } from './checks/result-message'
import { HttpError, validateBody } from './checks/submit-check'
import { verifySignature } from './line/line-api'
import { parseIntent } from './line/messages'
import { MockAudioInspectionProvider } from './shared/ai/providers/audio-inspection-provider'
import type { ImuSample } from './shared/imu/imu-preprocessor'

/** 18 s mono 16-bit WAV: a firing-pulse "engine" at 25 Hz idle, 45 Hz rev. */
function engineWav(): Buffer {
  const rate = 16000
  const seconds = 18
  const pcm = Buffer.alloc(rate * seconds * 2)
  let phase = 0
  for (let i = 0; i < rate * seconds; i++) {
    const t = i / rate
    const fundamental = t < 9 ? 25 : 45
    phase += (2 * Math.PI * fundamental) / rate
    let value = 0
    for (let harmonic = 1; harmonic <= 12; harmonic++) value += Math.sin(phase * harmonic) / harmonic
    value = value * (t < 9 ? 0.18 : 0.35) + (Math.random() - 0.5) * 0.02
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(value * 32767))), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

function steadyImu(): ImuSample[] {
  const samples: ImuSample[] = []
  for (let tMs = 0; tMs < 18000; tMs += 10) {
    const buzz = Math.sin(tMs / 7) * (tMs < 9000 ? 0.05 : 0.09)
    samples.push({ tMs, ax: buzz, ay: buzz * 0.5, az: 9.81 + buzz, gx: 0.01, gy: 0.01, gz: 0.01 })
  }
  return samples
}

describe('parseIntent', () => {
  it('recognises menu words with spacing variants', () => {
    assert.equal(parseIntent('開始檢測'), 'check')
    assert.equal(parseIntent(' 引擎檢測 '), 'check')
    assert.equal(parseIntent('回報問題'), 'report')
    assert.equal(parseIntent('找真人'), 'human')
    assert.equal(parseIntent('客服'), 'human')
    assert.equal(parseIntent('結束'), 'close')
    assert.equal(parseIntent('我的紀錄'), 'history')
    assert.equal(parseIntent('MENU'), 'help')
  })

  it('treats ordinary sentences as conversation', () => {
    assert.equal(parseIntent('我的車怠速會抖，檢測一下好嗎'), 'none')
    assert.equal(parseIntent('引擎有喀喀聲'), 'none')
  })
})

describe('verifySignature', () => {
  const body = Buffer.from('{"events":[]}')
  const secret = 'channel-secret'
  const good = crypto.createHmac('sha256', secret).update(body).digest('base64')

  it('accepts LINE’s HMAC and rejects anything else', () => {
    assert.equal(verifySignature(body, good, secret), true)
    assert.equal(verifySignature(body, good, 'other-secret'), false)
    assert.equal(verifySignature(Buffer.from('{}'), good, secret), false)
    assert.equal(verifySignature(body, undefined, secret), false)
    assert.equal(verifySignature(body, 'short', secret), false)
  })
})

describe('validateBody', () => {
  it('rejects missing audio and keeps only numeric IMU samples', () => {
    assert.throws(() => validateBody({}), HttpError)
    const parsed = validateBody({
      audioBase64: 'A'.repeat(2000),
      audioMimeType: 'audio/webm;codecs=opus',
      imuSamples: [
        { tMs: 0, ax: 0, ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0 },
        { tMs: 10, ax: 'x', ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0 },
      ],
      symptom: '怠速抖',
    })
    assert.equal(parsed.audioMimeType, 'audio/webm')
    assert.equal(parsed.imuSamples.length, 1)
    assert.equal(parsed.symptom, '怠速抖')
  })
})

describe('overallOf', () => {
  it('attention wins, normal needs both sound items normal', () => {
    assert.equal(
      overallOf([
        { id: 'engine_idle_sound', result: 'normal' },
        { id: 'engine_rev_sound', result: 'normal' },
        { id: 'idle_stability', result: 'unsure' },
      ]),
      'normal',
    )
    assert.equal(
      overallOf([
        { id: 'engine_idle_sound', result: 'normal' },
        { id: 'engine_rev_sound', result: 'unsure' },
      ]),
      'unsure',
    )
    assert.equal(
      overallOf([
        { id: 'engine_idle_sound', result: 'normal' },
        { id: 'rev_stability', result: 'attention' },
      ]),
      'attention',
    )
  })
})

describe('classifyImu', () => {
  it('reports unsure without motion data instead of guessing', () => {
    const items = classifyImu([])
    assert.deepEqual(
      items.map((item) => [item.id, item.result]),
      [
        ['idle_stability', 'unsure'],
        ['rev_stability', 'unsure'],
      ],
    )
  })
})

describe('analyzeCheck (RiDE hot pipeline)', () => {
  it('runs DSP + mock AI + IMU on an 18 s recording', async () => {
    const result = await analyzeCheck({
      audio: engineWav(),
      audioMimeType: 'audio/wav',
      imuSamples: steadyImu(),
      provider: new MockAudioInspectionProvider([]),
      apiKey: 'test',
    })
    assert.deepEqual(
      result.items.map((item) => item.id),
      ['engine_idle_sound', 'engine_rev_sound', 'idle_stability', 'rev_stability'],
    )
    assert.ok(['normal', 'attention', 'unsure'].includes(result.overall))
    assert.ok(result.research.recordingAssessment)
    const summary = resultSummaryText(result)
    assert.match(summary, /怠速聲音/)
    const message = resultMessage('check123', result, 'https://liff.line.me/x')
    assert.ok(message.quickReply?.items.some((item) => item.action.type === 'postback'))
  })

  it('without AI, items not decided by a hard rule read unsure', async () => {
    const result = await analyzeCheck({
      audio: engineWav(),
      audioMimeType: 'audio/wav',
      imuSamples: [],
      provider: null,
      apiKey: '',
    })
    assert.equal(result.aiAvailable, false)
    for (const item of result.items.slice(0, 2)) {
      assert.ok(item.source === 'hard_rule' || item.result === 'unsure')
    }
  })
})
