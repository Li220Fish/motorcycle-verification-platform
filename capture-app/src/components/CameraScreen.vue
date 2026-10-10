<script setup lang="ts">
/**
 * Full-screen guided viewfinder for one shot of the training shot plan.
 * The stream stays open while the parent swaps `shot` (auto-advance after
 * each 使用這張), so walking the bike never re-prompts for the camera.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  obbBounds,
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
  position: string
  alreadyTaken: number
}>()
const emit = defineEmits<{
  close: []
  vehicleType: [type: VehicleType]
  use: [captured: CapturedShot]
  skip: [reason: string]
  prev: []
  next: []
}>()

type Phase = 'starting' | 'live' | 'review' | 'error'
const phase = ref<Phase>('starting')
const errorMessage = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
const facing = ref<CameraFacing>('environment')
const hasTorch = ref(false)
const torchOn = ref(false)
const metrics = ref<FrameMetrics | null>(null)
const review = ref<{ captured: CapturedShot; url: string } | null>(null)
const skipSheet = ref(false)
const flashing = ref(false)

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

// 自動快門: fires once every check has stayed green for STEADY_MS, then
// queues the photo straight away (no review — it already passed the checks).
const STEADY_MS = 1000
const COOLDOWN_MS = 1800
const AUTO_KEY = 'ride-capture:auto-shutter'
function readAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== '0'
  } catch {
    return true
  }
}
const autoShutter = ref(readAuto())
let steadySince = 0
let cooldownUntil = 0
const steadyProgress = ref(0)
function toggleAuto(): void {
  autoShutter.value = !autoShutter.value
  try {
    localStorage.setItem(AUTO_KEY, autoShutter.value ? '1' : '0')
  } catch {
    /* per-viewer convenience only */
  }
}

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

  const now = Date.now()
  const ready = !!metrics.value && warnings.value.length === 0 && now >= cooldownUntil
  if (!ready) {
    steadySince = 0
    steadyProgress.value = 0
    return
  }
  if (!steadySince) steadySince = now
  steadyProgress.value = Math.min(1, (now - steadySince) / STEADY_MS)
  if (autoShutter.value && !props.shot.repeatable && now - steadySince >= STEADY_MS) {
    steadySince = 0
    steadyProgress.value = 0
    cooldownUntil = now + COOLDOWN_MS
    void shutter(true)
  }
}

async function shutter(auto = false): Promise<void> {
  const video = videoEl.value
  if (!video || phase.value !== 'live') return
  flashing.value = true
  setTimeout(() => (flashing.value = false), 120)
  const snapshot = measureFrame(video, primaryBox.value) ?? metrics.value
  const frame = await grabFrame(video)
  const captured: CapturedShot = {
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
  if (auto) {
    emit('use', captured)
    return
  }
  review.value = { captured, url: URL.createObjectURL(frame.blob) }
  phase.value = 'review'
}

function clearReview(): void {
  if (review.value) URL.revokeObjectURL(review.value.url)
  review.value = null
}

function retake(): void {
  clearReview()
  phase.value = 'live'
}

function useShot(): void {
  if (!review.value) return
  emit('use', review.value.captured)
  // Back to live for repeatable shots; for the rest the parent swaps `shot`.
  retake()
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
    steadySince = 0
    if (phase.value === 'review') retake()
  },
)

onMounted(() => {
  void startTilt()
  void openCamera()
  timer = window.setInterval(tick, 250)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  clearReview()
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
        <button
          class="auto-btn"
          :class="{ on: autoShutter }"
          :aria-pressed="autoShutter"
          @click="toggleAuto"
        >
          自動
        </button>
        <button class="icon-btn" aria-label="切換鏡頭" @click="flipCamera">⟲</button>
      </div>
    </header>

    <div class="viewfinder">
      <!-- v-show, not v-if: the stream keeps running under the review still,
           so 重拍 is instant. -->
      <video
        v-show="phase !== 'review'"
        ref="videoEl"
        class="feed"
        :class="{ mirror: facing === 'user' }"
        playsinline
        muted
        autoplay
      ></video>
      <img v-if="phase === 'review' && review" :src="review.url" class="feed" alt="剛拍的照片" />

      <GuideOverlay :guides="guides" :tone="warnings.length ? 'warn' : 'ok'" />

      <div
        v-if="phase === 'live' && roll !== null"
        class="level"
        :class="{ ok: level }"
        :style="{ transform: `translate(-50%, -50%) rotate(${-roll}deg)` }"
      ></div>

      <div v-if="phase === 'live'" class="ready" :class="{ ok: !warnings.length && metrics }">
        {{ !warnings.length && metrics ? (autoShutter ? '穩住…' : '可拍攝') : '對位中' }}
        <i
          v-if="autoShutter && steadyProgress > 0"
          :style="{ width: `${steadyProgress * 100}%` }"
        ></i>
      </div>

      <div v-if="phase === 'live' && warnings.length" class="warn-chips">
        <span v-for="w in warnings" :key="w" class="chip warn">{{ w }}</span>
      </div>
      <div
        v-else-if="phase === 'review' && review?.captured.quality.warnings.length"
        class="warn-chips"
      >
        <span v-for="w in review.captured.quality.warnings" :key="w" class="chip warn">{{
          w
        }}</span>
      </div>

      <div v-if="phase === 'starting'" class="vf-msg">開啟相機中…</div>
      <div v-if="phase === 'error'" class="vf-msg">
        <p>{{ errorMessage }}</p>
        <button class="btn" @click="openCamera">重試</button>
      </div>
      <div v-if="flashing" class="flash"></div>
    </div>

    <p class="instruction">{{ shot.instruction }}</p>

    <footer class="cam-bottom">
      <template v-if="phase === 'review'">
        <button class="btn ghost wide" @click="retake">重拍</button>
        <button class="btn primary wide" @click="useShot">使用這張</button>
      </template>
      <template v-else>
        <div class="side">
          <button class="nav-btn" aria-label="上一個" @click="emit('prev')">‹</button>
          <button v-if="shot.optional" class="btn ghost sm" @click="skipSheet = true">
            不適用
          </button>
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
      </template>
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

.ready i {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  background: #04140a;
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
