<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import {
  CALIBRATION_DURATION_MS,
  computeBaseline,
  instructionAt,
  isBaselineUsable,
  type Baseline,
} from '@tofu/core/calibration'
import type { ImuSample } from '@tofu/core/imu'
import EngineGauge from '@tofu/components/EngineGauge.vue'
import TofuBlock from '@tofu/components/TofuBlock.vue'
import { measureAudioLevels, saveCalibration, type LocalCalibration, type VehicleType } from '@tofu/services/data'
import { startMotion, stopMotion } from '@tofu/services/motion'
import { recorder } from '@tofu/services/recorder'
import { keepScreenOn, say } from '@tofu/services/voice'

const props = defineProps<{ uid: string | null }>()
const emit = defineEmits<{ done: [LocalCalibration]; cancel: [] }>()

type Step = 'vehicle' | 'prepare' | 'countdown' | 'recording' | 'processing' | 'review' | 'saving'
const step = ref<Step>('vehicle')
const vehicleType = ref<VehicleType>('scooter')
const countdown = ref(3)
const elapsedMs = ref(0)
const errorMessage = ref('')
const baseline = ref<Baseline | null>(null)

let samples: ImuSample[] = []
let startedAt = 0
let audioBlob: Blob | null = null
let timer: ReturnType<typeof setInterval> | null = null

const placementTip = computed(() =>
  vehicleType.value === 'scooter'
    ? '把手機平放在腳踏板中央（螢幕朝上、上緣朝車頭），或固定在手機架上。'
    : '把手機固定在手機架上，或平放在油箱／座墊上不會滑動的位置。',
)
const usable = computed(() => (baseline.value ? isBaselineUsable(baseline.value) : false))
const instruction = computed(() => instructionAt(elapsedMs.value / 1000))

function clearTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

async function begin(): Promise<void> {
  errorMessage.value = ''
  try {
    await recorder.checkPermission()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
    return
  }
  step.value = 'countdown'
  countdown.value = 3
  void keepScreenOn(true)
  void say('三秒後開始校正，請不要碰手機')
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimer()
      void record()
    }
  }, 1000)
}

async function record(): Promise<void> {
  samples = []
  try {
    await recorder.start()
    await startMotion((sample) => samples.push(sample))
  } catch (error) {
    abort(error instanceof Error ? error.message : String(error))
    return
  }
  startedAt = Date.now()
  elapsedMs.value = 0
  step.value = 'recording'
  let rev = false
  timer = setInterval(() => {
    elapsedMs.value = Date.now() - startedAt
    if (!rev && elapsedMs.value >= 9000) {
      rev = true
      void say('輕催油門')
    }
    if (elapsedMs.value >= CALIBRATION_DURATION_MS) {
      clearTimer()
      void finish()
    }
  }, 100)
}

async function finish(): Promise<void> {
  stopMotion()
  step.value = 'processing'
  try {
    const result = await recorder.stop()
    audioBlob = result.blob
    const audio = await measureAudioLevels(result.blob)
    baseline.value = computeBaseline(samples, startedAt, audio)
    step.value = 'review'
    void say(usable.value ? '校正完成' : '校正結果不理想，請看畫面說明')
  } catch (error) {
    abort(error instanceof Error ? error.message : String(error))
  } finally {
    void keepScreenOn(false)
  }
}

function abort(message: string): void {
  clearTimer()
  stopMotion()
  recorder.cancel()
  void keepScreenOn(false)
  errorMessage.value = message
  step.value = 'prepare'
}

async function save(): Promise<void> {
  if (!baseline.value || !audioBlob) return
  if (!props.uid) {
    errorMessage.value = '尚未連上伺服器，無法儲存校正，請確認網路後重試。'
    return
  }
  step.value = 'saving'
  errorMessage.value = ''
  try {
    const saved = await saveCalibration({
      uid: props.uid,
      vehicleType: vehicleType.value,
      baseline: baseline.value,
      audio: audioBlob,
      samples,
      startedAt,
    })
    emit('done', saved)
  } catch (error) {
    errorMessage.value = `上傳失敗：${error instanceof Error ? error.message : error}`
    step.value = 'review'
  }
}

onBeforeUnmount(() => {
  clearTimer()
  stopMotion()
  if (step.value === 'recording') recorder.cancel()
  void keepScreenOn(false)
})
</script>

<template>
  <div class="screen">
    <h1>基準值校正</h1>

    <template v-if="step === 'vehicle'">
      <p class="muted">沿用引擎檢測的「聲音＋震動」錄製，引擎已經發動即可（不需要冷車）。先選車型：</p>
      <div class="row">
        <button class="btn" :class="{ secondary: vehicleType !== 'scooter' }" @click="vehicleType = 'scooter'">速可達</button>
        <button class="btn" :class="{ secondary: vehicleType !== 'manual' }" @click="vehicleType = 'manual'">檔車</button>
      </div>
      <div class="spacer" />
      <button class="btn" @click="step = 'prepare'">下一步</button>
      <button class="btn ghost" @click="$emit('cancel')">返回</button>
    </template>

    <template v-else-if="step === 'prepare'">
      <div class="card">
        <h2>1. 固定手機</h2>
        <p>{{ placementTip }}</p>
        <p class="muted">之後送豆腐時，手機也要放在<b>同一個位置</b>，判定才準確。</p>
      </div>
      <div class="card">
        <h2>2. 發動引擎</h2>
        <p>引擎發動、維持怠速，車輛停在原地（不需要冷車）。</p>
      </div>
      <div class="card">
        <h2>3. 錄製 18 秒</h2>
        <p>前 9 秒保持怠速，後 9 秒輕催油門幾下。全程不要碰手機。</p>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <div class="spacer" />
      <button class="btn" @click="begin">引擎已發動，開始校正</button>
      <button class="btn ghost" @click="step = 'vehicle'">上一步</button>
    </template>

    <div v-else-if="step === 'countdown'" class="big-center">
      <p :key="countdown" class="big pop">{{ countdown }}</p>
      <p class="muted">放開手機…</p>
    </div>

    <div v-else-if="step === 'recording'" class="big-center">
      <p class="rec">● 錄製中 {{ Math.floor(elapsedMs / 1000) }} / 18 秒</p>
      <EngineGauge :phase="elapsedMs >= 9000 ? 'rev' : 'idle'" />
      <p class="instruction">{{ instruction }}</p>
      <div class="bar"><div class="bar-fill" :style="{ width: `${(elapsedMs / 18000) * 100}%` }" /></div>
    </div>

    <div v-else-if="step === 'processing' || step === 'saving'" class="big-center">
      <TofuBlock :size="110" />
      <p class="muted">{{ step === 'processing' ? '計算基準值…' : '上傳到資料庫…' }}</p>
    </div>

    <template v-else-if="step === 'review' && baseline">
      <div class="card">
        <h2>{{ usable ? '校正完成 ✅' : '需要重新校正' }}</h2>
        <div class="stat"><span>取樣率</span><b>{{ baseline.sampleRateHz }} Hz</b></div>
        <div class="stat"><span>怠速震動</span><b>{{ baseline.idleVibration.toFixed(3) }} m/s²</b></div>
        <div class="stat"><span>催油門震動</span><b>{{ baseline.revVibration.toFixed(3) }} m/s²</b></div>
        <div class="stat"><span>手機晃動</span><b>{{ baseline.idleRotation.toFixed(1) }} °/s</b></div>
        <div class="stat">
          <span>怠速／催油門音量</span>
          <b>{{ baseline.audio.idleDb ?? '—' }} / {{ baseline.audio.revDb ?? '—' }} dBFS</b>
        </div>
        <ul v-if="baseline.quality.warnings.length" class="warn-list">
          <li v-for="warning in baseline.quality.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <div class="spacer" />
      <button class="btn" :disabled="!usable" @click="save">儲存基準值</button>
      <button class="btn secondary" @click="step = 'prepare'">重新校正</button>
    </template>
  </div>
</template>

<style scoped>
.big-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; }
.big { font-size: 96px; font-weight: 900; margin: 0; color: var(--accent); }
.rec { color: var(--bad); font-weight: 800; animation: blink 1s steps(2) infinite; }
.pop { animation: pop 0.9s ease-out; }
@keyframes pop { 0% { transform: scale(1.8); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 100% { opacity: 0.7; } }
@keyframes blink { 50% { opacity: 0.55; } }
.instruction { font-size: 26px; font-weight: 800; }
.bar { width: 100%; height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.bar-fill { height: 100%; background: var(--accent); transition: width 0.1s linear; }
</style>
