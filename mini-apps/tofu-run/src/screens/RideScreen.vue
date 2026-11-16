<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import TofuBlock from '@tofu/components/TofuBlock.vue'
import type { TofuMotion } from '@tofu/components/tofu-motion'
import { TripRecorder } from '@tofu/core/geo'
import { gradeFor, TofuEngine, VOICE_LINES, type TofuEvent } from '@tofu/core/tofu-engine'
import type { LocalCalibration, RunRecord } from '@tofu/services/data'
import { startGps, stopGps } from '@tofu/services/gps'
import { startMotion, stopMotion } from '@tofu/services/motion'
import { beep, keepScreenOn, say } from '@tofu/services/voice'

const props = defineProps<{ calibration: LocalCalibration; uid: string | null }>()
const emit = defineEmits<{ finish: [RunRecord] }>()

const engine = new TofuEngine(props.calibration.baseline)
const trip = new TripRecorder()
const events: TofuEvent[] = []

const integrity = ref(100)
const distance = ref(0)
const elapsed = ref(0)
const gpsLost = ref(false)
const holdProgress = ref(0)
const motion = ref<TofuMotion | null>(null)
const flash = ref(0)
const startedAt = Date.now()

let clock: ReturnType<typeof setInterval> | null = null
let holdTimer: ReturnType<typeof setInterval> | null = null
let lastFixAt = Date.now()

const tone = computed(() =>
  integrity.value >= 80 ? 'good' : integrity.value >= 50 ? 'warn' : integrity.value > 0 ? 'bad' : 'broken',
)

function handleEvents(produced: TofuEvent[]): void {
  for (const event of produced) {
    if (event.type === 'sway' || event.type === 'bump') {
      events.push(event)
      motion.value = { kind: event.type, n: (motion.value?.n ?? 0) + 1 }
      flash.value += 1
    }
    if (event.type === 'bump') beep(320, 140)
    if (event.type === 'warning') void say(VOICE_LINES[`warn${event.integrity}`] ?? '')
    if (event.type === 'broken') void say(VOICE_LINES.broken)
  }
  integrity.value = engine.integrity
}

onMounted(async () => {
  void keepScreenOn(true)
  void say(VOICE_LINES.start)
  await startMotion((sample) => {
    // GPS silent for >10 s (tunnel, indoor): keep judging as "moving" rather
    // than letting the rider off the hook.
    const moving = trip.isMoving(sample.t) || Date.now() - lastFixAt > 10000
    handleEvents(engine.push(sample, moving))
  }).catch(() => {})
  await startGps(
    (fix) => {
      lastFixAt = Date.now()
      gpsLost.value = false
      trip.add(fix)
      distance.value = trip.distanceMeters
    },
    () => (gpsLost.value = true),
  ).catch(() => (gpsLost.value = true))
  clock = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
    if (Date.now() - lastFixAt > 10000) gpsLost.value = true
  }, 1000)
})

function stopAll(): void {
  stopMotion()
  void stopGps()
  if (clock) clearInterval(clock)
  void keepScreenOn(false)
}

onBeforeUnmount(stopAll)

/** Long-press so a bump against the phone can't end the run by accident. */
function holdStart(): void {
  holdProgress.value = 0
  holdTimer = setInterval(() => {
    holdProgress.value += 5
    if (holdProgress.value >= 100) {
      holdEnd()
      arrive()
    }
  }, 75)
}

function holdEnd(): void {
  if (holdTimer) clearInterval(holdTimer)
  holdTimer = null
  if (holdProgress.value < 100) holdProgress.value = 0
}

function arrive(): void {
  stopAll()
  const endedAt = Date.now()
  const grade = gradeFor(engine.integrity, trip.distanceMeters)
  if (grade && grade !== '失敗') void say(VOICE_LINES.arrive)
  emit('finish', {
    uid: props.uid ?? '',
    calibrationId: props.calibration.calibrationId,
    startedAt,
    endedAt,
    distanceMeters: Math.round(trip.distanceMeters),
    durationSeconds: Math.round((endedAt - startedAt) / 1000),
    integrity: engine.integrity,
    grade,
    events: events.slice(0, 50),
    eventCounts: {
      sway: events.filter((e) => e.type === 'sway').length,
      bump: events.filter((e) => e.type === 'bump').length,
    },
    path: trip.path,
  })
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="ride" :class="tone">
    <div :key="flash" class="flash" :class="{ on: flash > 0 }" />
    <TofuBlock class="tofu" :integrity="integrity" :motion="motion" size="min(64vw, 280px)" />
    <p class="integrity">{{ Math.round(integrity) }}<span>%</span></p>
    <p class="label">豆腐完整度</p>
    <div class="meter"><div class="meter-fill" :style="{ width: `${Math.max(0, integrity)}%` }" /></div>
    <p class="meta">{{ (distance / 1000).toFixed(2) }} km ・ {{ formatTime(elapsed) }}</p>
    <p v-if="gpsLost" class="meta warn">GPS 訊號弱</p>
    <p class="hint">騎乘中請勿操作手機・停好車後長按下方按鈕</p>
    <button
      class="arrive"
      @pointerdown="holdStart"
      @pointerup="holdEnd"
      @pointerleave="holdEnd"
      @pointercancel="holdEnd"
    >
      <span class="fill" :style="{ width: `${holdProgress}%` }" />
      <span class="text">長按「抵達」結束</span>
    </button>
  </div>
</template>

<style scoped>
.ride {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 18px calc(env(safe-area-inset-bottom, 0px) + 24px);
  background: #000;
  text-align: center;
}
.ride { position: relative; overflow: hidden; }
.tofu { margin-top: auto; }
.label { color: var(--muted); font-size: 16px; }
.integrity { font-size: 72px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
.integrity span { font-size: 28px; }
.meter { width: min(80vw, 320px); height: 10px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.meter-fill { height: 100%; border-radius: 999px; background: var(--good); transition: width 0.4s, background 0.4s; }
.warn .meter-fill { background: var(--warn); }
.bad .meter-fill, .broken .meter-fill { background: var(--bad); }
.flash { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 40%, rgba(255, 93, 93, 0.35), transparent 70%); opacity: 0; }
.flash.on { animation: flash 0.5s ease-out; }
@keyframes flash { from { opacity: 1; } to { opacity: 0; } }
.good .integrity { color: var(--good); }
.warn .integrity { color: var(--warn); }
.bad .integrity, .broken .integrity { color: var(--bad); }
.meta { color: var(--muted); font-size: 18px; font-variant-numeric: tabular-nums; }
.meta.warn { color: var(--warn); }
.hint { margin-top: auto; color: #6b7280; font-size: 13px; }
.arrive {
  position: relative;
  width: 100%;
  min-height: 72px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 800;
  font-size: 18px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
.arrive .fill { position: absolute; inset: 0 auto 0 0; background: var(--accent); opacity: 0.6; }
.arrive .text { position: relative; }
</style>
