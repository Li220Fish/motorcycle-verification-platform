<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import {
  instructionAt,
  normalizeSamples,
  RESULT_ICON,
  RESULT_LABEL,
  SESSION_DURATION_MS,
} from '@el/core/session'
import { blobToBase64, SessionCapture } from '@el/services/capture'
import { resolveIdentity, type Identity } from '@el/services/identity'
import { SUBMIT_URL } from '@el/settings'

type Step = 'loading' | 'info' | 'prepare' | 'countdown' | 'recording' | 'analyzing' | 'result' | 'error'

interface CheckItem {
  id: string
  title: string
  result: 'normal' | 'attention' | 'unsure'
  note: string | null
}
interface SubmitResponse {
  checkId: string
  result: { overall: 'normal' | 'attention' | 'unsure'; items: CheckItem[]; engineTypeNote: string | null; aiAvailable: boolean }
}

const step = ref<Step>('loading')
const identity = ref<Identity | null>(null)
const errorMessage = ref('')
const countdown = ref(3)
const elapsedMs = ref(0)
const motionAvailable = ref(true)
const outcome = ref<SubmitResponse | null>(null)
const vehicle = reactive({ type: 'scooter', brand: '', model: '', year: '', mileageKm: '' })
const symptom = ref('')

const capture = new SessionCapture()
let timer: ReturnType<typeof setInterval> | null = null
let startedAt = 0

const instruction = computed(() => instructionAt(elapsedMs.value))
const progress = computed(() => Math.min(100, (elapsedMs.value / SESSION_DURATION_MS) * 100))

onMounted(async () => {
  try {
    identity.value = await resolveIdentity()
    step.value = 'info'
  } catch (error) {
    fail(`無法登入：${error instanceof Error ? error.message : error}`)
  }
})

onBeforeUnmount(() => {
  clearTimer()
  capture.release()
})

function clearTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

function fail(message: string): void {
  clearTimer()
  capture.release()
  errorMessage.value = message
  step.value = 'error'
}

function vibrate(ms: number): void {
  if ('vibrate' in navigator) navigator.vibrate(ms)
}

async function begin(): Promise<void> {
  errorMessage.value = ''
  try {
    motionAvailable.value = (await capture.prepare()).motion
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
    return
  }
  step.value = 'countdown'
  countdown.value = 3
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimer()
      record()
    }
  }, 1000)
}

function record(): void {
  try {
    startedAt = capture.start()
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
    return
  }
  step.value = 'recording'
  elapsedMs.value = 0
  vibrate(200)
  let revCued = false
  timer = setInterval(() => {
    elapsedMs.value = Date.now() - startedAt
    if (!revCued && elapsedMs.value >= 9000) {
      revCued = true
      vibrate(400)
    }
    if (elapsedMs.value >= SESSION_DURATION_MS) {
      clearTimer()
      void submit()
    }
  }, 100)
}

async function submit(): Promise<void> {
  step.value = 'analyzing'
  vibrate(200)
  try {
    const audio = await capture.stop()
    const { samples } = normalizeSamples(capture.motion, startedAt)
    const { headers, lineIdToken } = await identity.value!.credentials()
    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        lineIdToken,
        audioBase64: await blobToBase64(audio),
        audioMimeType: audio.type || 'audio/webm',
        imuSamples: samples,
        vehicle: { ...vehicle, mileageKm: vehicle.mileageKm ? Number(vehicle.mileageKm) : null },
        symptom: symptom.value,
        device: { userAgent: navigator.userAgent.slice(0, 200), motion: motionAvailable.value },
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error ?? `伺服器錯誤 (${response.status})`)
    outcome.value = data as SubmitResponse
    step.value = 'result'
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

function again(): void {
  outcome.value = null
  errorMessage.value = ''
  step.value = 'prepare'
}

const headline: Record<string, string> = {
  normal: '這次錄到的引擎聲音和震動沒有明顯異常',
  attention: '有項目需要注意，建議找熟悉的車行再確認',
  unsure: '這次的錄音不足以判斷，可以換個位置再錄一次',
}
</script>

<template>
  <main class="page">
    <header class="top">
      <span class="logo">🏍️</span>
      <div>
        <h1>引擎異音檢測</h1>
        <p class="muted small">學生研究團隊・{{ identity?.mode === 'dev' ? '測試模式（尚未連接 LINE）' : identity?.displayName ?? '' }}</p>
      </div>
    </header>

    <section v-if="step === 'loading'" class="center"><p class="muted">載入中…</p></section>

    <section v-else-if="step === 'info'" class="stack">
      <div class="card stack">
        <h2>你的車</h2>
        <div class="seg">
          <button :class="{ on: vehicle.type === 'scooter' }" @click="vehicle.type = 'scooter'">速可達</button>
          <button :class="{ on: vehicle.type === 'manual' }" @click="vehicle.type = 'manual'">檔車</button>
        </div>
        <div class="grid2">
          <label>品牌<input v-model="vehicle.brand" placeholder="例：光陽" maxlength="40" /></label>
          <label>車型<input v-model="vehicle.model" placeholder="例：雷霆S 150" maxlength="60" /></label>
          <label>年份<input v-model="vehicle.year" inputmode="numeric" placeholder="例：2019" maxlength="4" /></label>
          <label>里程 (km)<input v-model="vehicle.mileageKm" inputmode="numeric" placeholder="選填" maxlength="7" /></label>
        </div>
        <label>有感覺到什麼狀況嗎？（選填）
          <textarea v-model="symptom" rows="3" maxlength="1000" placeholder="例：怠速時有喀喀聲、催油門會抖" />
        </label>
      </div>
      <button class="btn" @click="step = 'prepare'">下一步</button>
      <p class="muted small">錄音與資料只用於引擎異音研究，不會公開。</p>
    </section>

    <section v-else-if="step === 'prepare'" class="stack">
      <div class="card">
        <ol class="steps">
          <li><b>發動引擎</b>，車子停穩（不需要冷車）。</li>
          <li><b>手機平放</b>在腳踏板或座墊上，麥克風朝向引擎。</li>
          <li>按開始後<b>不要碰手機</b>：前 9 秒怠速，手機震動後<b>輕催油門幾下</b>，共 18 秒。</li>
        </ol>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <button class="btn" @click="begin">引擎已發動，開始錄製</button>
      <button class="btn ghost" @click="step = 'info'">上一步</button>
    </section>

    <section v-else-if="step === 'countdown'" class="center">
      <p class="big">{{ countdown }}</p>
      <p class="muted">放下手機…</p>
    </section>

    <section v-else-if="step === 'recording'" class="center stack">
      <p class="rec">● 錄製中 {{ Math.floor(elapsedMs / 1000) }} / 18 秒</p>
      <p class="instruction">{{ instruction }}</p>
      <div class="bar"><div class="fill" :style="{ width: `${progress}%` }" /></div>
      <p v-if="!motionAvailable" class="muted small">這支手機沒有提供震動感測，只分析聲音。</p>
    </section>

    <section v-else-if="step === 'analyzing'" class="center stack">
      <div class="spinner" />
      <p>分析中，約 10–30 秒…</p>
      <p class="muted small">可以先熄火了</p>
    </section>

    <section v-else-if="step === 'result' && outcome" class="stack">
      <div class="card result" :class="outcome.result.overall">
        <p class="overall">{{ RESULT_ICON[outcome.result.overall] }} {{ RESULT_LABEL[outcome.result.overall] }}</p>
        <p>{{ headline[outcome.result.overall] }}</p>
      </div>
      <div class="card">
        <div v-for="item in outcome.result.items" :key="item.id" class="item">
          <div class="row-between">
            <span>{{ item.title }}</span>
            <b :class="item.result">{{ RESULT_ICON[item.result] }} {{ RESULT_LABEL[item.result] }}</b>
          </div>
          <p v-if="item.note && item.result !== 'normal'" class="muted small">{{ item.note }}</p>
        </div>
        <p v-if="outcome.result.engineTypeNote" class="muted small">聽起來像：{{ outcome.result.engineTypeNote }}</p>
      </div>
      <p class="muted small">※ 研究用的初步判斷，不能取代車行實際檢修。{{ identity?.mode === 'line' ? '結果也已傳到 LINE 聊天室，有疑問可以直接在 LINE 找真人。' : '' }}</p>
      <button class="btn" @click="again">再測一次</button>
      <button v-if="identity?.mode === 'line'" class="btn ghost" @click="identity?.closeWindow()">回到 LINE</button>
    </section>

    <section v-else-if="step === 'error'" class="stack">
      <p class="error">{{ errorMessage }}</p>
      <button class="btn" @click="again">重新再試</button>
    </section>
  </main>
</template>

<style scoped>
.page { max-width: 520px; margin: 0 auto; padding: 16px 16px calc(env(safe-area-inset-bottom, 0px) + 24px); min-height: 100vh; display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; gap: 12px; align-items: center; }
.logo { font-size: 36px; }
h1 { font-size: 22px; margin: 0; }
h2 { font-size: 17px; margin: 0; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px; }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.seg button { padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); font: inherit; font-weight: 700; color: var(--ink); }
.seg button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }
input, textarea { font: inherit; font-size: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); min-width: 0; }
.steps { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; line-height: 1.5; }
.big { font-size: 96px; font-weight: 900; color: var(--accent); margin: 0; }
.rec { color: var(--bad); font-weight: 800; }
.instruction { font-size: 26px; font-weight: 800; }
.bar { width: 100%; height: 10px; border-radius: 999px; background: var(--line); overflow: hidden; }
.fill { height: 100%; background: var(--accent); transition: width 0.1s linear; }
.spinner { width: 44px; height: 44px; border-radius: 50%; border: 4px solid var(--line); border-top-color: var(--accent); animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result { text-align: center; }
.overall { font-size: 28px; font-weight: 900; margin: 0 0 6px; }
.result.normal { border-color: var(--good); }
.result.attention { border-color: var(--warn); }
.item { padding: 8px 0; border-bottom: 1px solid var(--line); }
.item:last-of-type { border-bottom: 0; }
.row-between { display: flex; justify-content: space-between; gap: 8px; }
b.normal { color: var(--good); }
b.attention { color: var(--warn); }
b.unsure { color: var(--muted); }
</style>
