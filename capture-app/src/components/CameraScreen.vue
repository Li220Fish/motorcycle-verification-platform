<script setup lang="ts">
/**
 * Full-screen guided viewfinder for one shot of the training shot plan.
 * Each shutter press hands the photo straight to the parent (no review
 * step), which queues the upload and swaps `shot` to the next item; the
 * stream stays open across shots, so walking the bike never re-prompts.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  FRONT_BRAKE_LABEL,
  obbBounds,
  REAR_BRAKE_LABEL,
  type BrakeSetup,
  type CaptureQuality,
  type NormalizedBox,
  type VehicleType,
  VEHICLE_TYPE_LABEL,
} from '@/data/training/training-dataset.types'
import {
  GUIDE_VIEW_H,
  GUIDE_VIEW_W,
  guideToObb,
  shotGuides,
  TRAINING_STAGE_LABEL,
  type TrainingShotDef,
} from '@/data/training/training-shots'
import {
  grabFrame,
  setTorch,
  startCamera,
  stopCamera,
  torchSupported,
  type CameraFacing,
  type GrabbedFrame,
} from '@capture/services/camera'
import { effectiveRoll, startTilt, tilt } from '@capture/services/device-tilt'
import { frameWarnings, measureFrame, type FrameMetrics } from '@capture/services/frame-quality'
import GuideOverlay from './GuideOverlay.vue'

export interface CapturedShot {
  frame: GrabbedFrame
  quality: CaptureQuality
  videoWidth: number
  videoHeight: number
}

const props = defineProps<{
  shot: TrainingShotDef
  vehicleType: VehicleType
  brakes: BrakeSetup
  position: string
  alreadyTaken: number
}>()
const emit = defineEmits<{
  close: []
  vehicleType: [type: VehicleType]
  brakes: [brakes: BrakeSetup]
  use: [captured: CapturedShot]
  skip: [reason: string]
  prev: []
  next: []
}>()

type Phase = 'starting' | 'live' | 'error'
const phase = ref<Phase>('starting')
const errorMessage = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
const facing = ref<CameraFacing>('environment')
const hasTorch = ref(false)
const torchOn = ref(false)
const metrics = ref<FrameMetrics | null>(null)
const saved = ref(false)
const skipSheet = ref(false)
const flashing = ref(false)

/** Brake shots let the collector set this bike's layout right where it matters. */
const brakeOptions = computed(() => {
  if (props.shot.partKey === 'frontbrake') {
    return (Object.keys(FRONT_BRAKE_LABEL) as BrakeSetup['front'][]).map((v) => ({
      label: FRONT_BRAKE_LABEL[v],
      active: props.brakes.front === v,
      pick: () => emit('brakes', { ...props.brakes, front: v }),
    }))
  }
  if (props.shot.partKey === 'rearbrake') {
    return (Object.keys(REAR_BRAKE_LABEL) as BrakeSetup['rear'][]).map((v) => ({
      label: REAR_BRAKE_LABEL[v],
      active: props.brakes.rear === v,
      pick: () => emit('brakes', { ...props.brakes, rear: v }),
    }))
  }
  return null
})

const guides = computed(() => shotGuides(props.shot, props.vehicleType))
/** Axis-aligned bounds of the subject guide — where sharpness is measured. */
const primaryBox = computed<NormalizedBox>(() => {
  const g = guides.value.find((x) => x.kind !== 'dot' && !x.hint && x.label)
  const obb = g ? guideToObb(g) : null
  return obb ? obbBounds(obb, GUIDE_VIEW_W, GUIDE_VIEW_H) : { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }
})
const roll = computed(() => (tilt.rollDeg === null ? null : effectiveRoll()))
const warnings = computed(() => frameWarnings(metrics.value, roll.value))
const level = computed(() => roll.value !== null && Math.abs(roll.value) <= 2)

let timer: number | undefined
let savedTimer: number | undefined

async function openCamera(): Promise<void> {
  phase.value = 'starting'
  try {
    const stream = await startCamera(facing.value)
    phase.value = 'live'
    if (videoEl.value) {
      videoEl.value.srcObject = stream
      await videoEl.value.play().catch(() => undefined)
    }
    hasTorch.value = torchSupported()
    torchOn.value = false
  } catch (error) {
    phase.value = 'error'
    errorMessage.value =
      error instanceof Error && error.name === 'NotAllowedError'
        ? '相機權限被拒絕，請到瀏覽器設定允許此網站使用相機。'
        : error instanceof Error
          ? error.message
          : '無法開啟相機'
  }
}

function tick(): void {
  if (phase.value !== 'live' || !videoEl.value) return
  metrics.value = measureFrame(videoEl.value, primaryBox.value)
}

let busy = false
async function shutter(): Promise<void> {
  const video = videoEl.value
  if (!video || phase.value !== 'live' || busy) return
  busy = true
  flashing.value = true
  setTimeout(() => (flashing.value = false), 120)
  let captured: CapturedShot
  try {
    const snapshot = measureFrame(video, primaryBox.value) ?? metrics.value
    const frame = await grabFrame(video)
    captured = {
      frame,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      quality: {
        brightness: Math.round(snapshot?.brightness ?? 0),
        sharpness: Math.round(snapshot?.sharpness ?? 0),
        rollDeg: roll.value === null ? null : Math.round(roll.value * 10) / 10,
        pitchDeg: tilt.pitchDeg === null ? null : Math.round(tilt.pitchDeg * 10) / 10,
        warnings: frameWarnings(snapshot, roll.value),
      },
    }
  } finally {
    busy = false
  }
  emit('use', captured)
  saved.value = true
  window.clearTimeout(savedTimer)
  savedTimer = window.setTimeout(() => (saved.value = false), 900)
}

async function toggleTorch(): Promise<void> {
  try {
    await setTorch(!torchOn.value)
    torchOn.value = !torchOn.value
  } catch {
    hasTorch.value = false
  }
}

async function flipCamera(): Promise<void> {
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  await openCamera()
}

const SKIP_REASONS = ['此車無此部件', '被車殼遮住看不到', '部件已拆除', '其他']
function chooseSkip(reason: string): void {
  skipSheet.value = false
  emit('skip', reason)
}

watch(
  () => props.shot.id,
  () => {
    skipSheet.value = false
  },
)

onMounted(() => {
  void startTilt()
  void openCamera()
  timer = window.setInterval(tick, 250)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  window.clearTimeout(savedTimer)
  stopCamera()
})
</script>

<template>
  <div class="cam">
    <header class="cam-top">
      <button class="icon-btn" aria-label="返回清單" @click="emit('close')">✕</button>
      <div class="cam-title">
        <span class="cam-stage">{{ TRAINING_STAGE_LABEL[shot.stage] }} · {{ position }}</span>
        <strong>{{ shot.title }}</strong>
      </div>
      <div class="cam-top-actions">
        <button
          v-if="hasTorch"
          class="icon-btn"
          :class="{ on: torchOn }"
          aria-label="手電筒"
          @click="toggleTorch"
        >
          ϟ
        </button>
        <button
          class="auto-btn on"
          aria-label="切換速克達或檔車引導框"
          @click="emit('vehicleType', vehicleType === 'scooter' ? 'manual' : 'scooter')"
        >
          {{ VEHICLE_TYPE_LABEL[vehicleType] }}
        </button>
        <button class="icon-btn" aria-label="切換鏡頭" @click="flipCamera">⟲</button>
      </div>
    </header>

    <div class="viewfinder">
      <video
        ref="videoEl"
        class="feed"
        :class="{ mirror: facing === 'user' }"
        playsinline
        muted
        autoplay
      ></video>

      <GuideOverlay :guides="guides" :tone="warnings.length ? 'warn' : 'ok'" />

      <div
        v-if="phase === 'live' && roll !== null"
        class="level"
        :class="{ ok: level }"
        :style="{ transform: `translate(-50%, -50%) rotate(${-roll}deg)` }"
      ></div>

      <div v-if="phase === 'live'" class="ready" :class="{ ok: !warnings.length && metrics }">
        {{ !warnings.length && metrics ? '可拍攝' : '對位中' }}
      </div>

      <div v-if="phase === 'live' && warnings.length" class="warn-chips">
        <span v-for="w in warnings" :key="w" class="chip warn">{{ w }}</span>
      </div>
      <div v-if="saved" class="saved">✓ 已存，上傳中</div>

      <div v-if="phase === 'starting'" class="vf-msg">開啟相機中…</div>
      <div v-if="phase === 'error'" class="vf-msg">
        <p>{{ errorMessage }}</p>
        <button class="btn" @click="openCamera">重試</button>
      </div>
      <div v-if="flashing" class="flash"></div>
    </div>

    <div v-if="brakeOptions" class="brake-pick" role="group" aria-label="煞車形式">
      <button
        v-for="o in brakeOptions"
        :key="o.label"
        :class="{ on: o.active }"
        :aria-pressed="o.active"
        @click="o.pick()"
      >
        {{ o.label }}
      </button>
    </div>
    <p class="instruction">{{ shot.instruction }}</p>

    <footer class="cam-bottom">
      <div class="side">
        <button class="nav-btn" aria-label="上一個" @click="emit('prev')">‹</button>
        <button v-if="shot.optional" class="btn ghost sm" @click="skipSheet = true">不適用</button>
      </div>
      <button
        class="shutter"
        :class="{ ok: !warnings.length && metrics }"
        :disabled="phase !== 'live'"
        aria-label="拍照"
        @click="shutter()"
      >
        <span></span>
      </button>
      <div class="side right">
        <span v-if="alreadyTaken" class="taken">已拍 {{ alreadyTaken }}</span>
        <button class="nav-btn" aria-label="下一個" @click="emit('next')">›</button>
      </div>
    </footer>

    <div v-if="skipSheet" class="sheet-backdrop" @click.self="skipSheet = false">
      <div class="sheet">
        <h3>標記「{{ shot.title }}」不適用</h3>
        <button v-for="r in SKIP_REASONS" :key="r" class="btn ghost wide" @click="chooseSkip(r)">
          {{ r }}
        </button>
        <button class="btn wide" @click="skipSheet = false">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cam {
  position: fixed;
  inset: 0;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.cam-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(env(safe-area-inset-top) + 8px) 12px 8px;
}

.cam-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.cam-title strong {
  font-size: 17px;
}

.cam-stage {
  font-size: 12px;
  color: var(--muted);
}

.cam-top-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 18px;
}

.icon-btn.on {
  background: var(--warn);
  color: #000;
}

.viewfinder {
  position: relative;
  aspect-ratio: 3 / 4;
  width: min(
    100vw,
    calc((100dvh - 230px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 0.75)
  );
  margin: 0 auto;
  overflow: hidden;
  background: #111;
}

.feed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feed.mirror {
  transform: scaleX(-1);
}

.level {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 46%;
  height: 2px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.level.ok {
  background: var(--ok);
}

.warn-chips {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.vf-msg {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  background: rgba(0, 0, 0, 0.6);
}

.flash {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0.7;
}

.brake-pick {
  display: flex;
  gap: 6px;
  padding: 10px 16px 0;
}

.brake-pick button {
  flex: 1;
  height: 34px;
  border-radius: 17px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.brake-pick button.on {
  border-color: var(--guide);
  background: var(--guide);
  color: #1e1400;
}

.instruction {
  margin: 0;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #e7ecf3;
  min-height: 62px;
}

.cam-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px calc(env(safe-area-inset-bottom) + 14px);
}

.side {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.side.right {
  justify-content: flex-end;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 24px;
  line-height: 1;
}

.taken {
  font-size: 12px;
  color: var(--ok);
}

.shutter {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 4px solid #fff;
  background: transparent;
  padding: 4px;
  flex: none;
}

.shutter span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
}

.shutter:active span {
  transform: scale(0.9);
}

.shutter.ok span {
  background: var(--guide);
}

.auto-btn {
  height: 38px;
  padding: 0 12px;
  border-radius: 19px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.auto-btn.on {
  border-color: var(--guide);
  color: var(--guide);
}

.ready {
  position: absolute;
  right: 8px;
  top: 8px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--bad);
  color: #fff;
}

.ready.ok {
  background: var(--ok);
  color: #04140a;
}

.saved {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--ok);
  font-weight: 700;
  pointer-events: none;
}

.shutter:disabled {
  opacity: 0.4;
}

.btn.wide {
  flex: 1;
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  z-index: 20;
}

.sheet {
  width: 100%;
  background: var(--surface);
  border-radius: 16px 16px 0 0;
  padding: 18px 16px calc(env(safe-area-inset-bottom) + 18px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sheet h3 {
  margin: 0 0 6px;
  font-size: 16px;
}
</style>
