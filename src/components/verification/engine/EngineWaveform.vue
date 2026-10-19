<script setup lang="ts">
/**
 * Live "recording in progress" bar visualization, shared by every Engine
 * session's measurement panel (spec: 底下顯示錄音音軌或 IMU 測量數值，
 * 用一致的波形風格呈現兩種資料). Two data modes:
 *
 * - `magnitude` supplied (idle/rev sessions, which also capture motion):
 *   bars are driven by the REAL accelerometer-magnitude value the parent
 *   passes in (see EngineInspectionFlow.vue's motion sample callback),
 *   sampled every 100ms and auto-scaled to its own recent peak — genuinely
 *   reactive, not decorative.
 * - `magnitude` omitted (startup session, audio-only): there is no live
 *   audio-level source in this app (capacitor-voice-recorder only returns
 *   the finished blob, no streaming amplitude), so the bars instead run a
 *   gentle decorative pulse purely to indicate "recording is active". This
 *   is never presented as a real waveform of the captured audio.
 */
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    active: boolean
    /** Normalized 0..1 real motion-magnitude sample, updated by the parent
     *  on every devicemotion event while `active` is true. */
    magnitude?: number | null
  }>(),
  { magnitude: null },
)

const BAR_COUNT = 28
const bars = ref<number[]>(Array.from({ length: BAR_COUNT }, () => 0.08))
let tickTimer: ReturnType<typeof setInterval> | null = null

function pushBar(value: number): void {
  bars.value = [...bars.value.slice(1), Math.min(1, Math.max(0.06, value))]
}

function decorativeTick(): void {
  // Smooth pulse that keeps pulling back toward the middle. The previous
  // free random walk could drift onto the 0.06 floor and sit there, which
  // looked like a frozen first frame.
  const last = bars.value[bars.value.length - 1] ?? 0.4
  const next = last + (0.45 - last) * 0.35 + (Math.random() - 0.5) * 0.4
  pushBar(next)
}

/** Running peak of the real readings, decaying slowly — auto-gain, so the
 *  tiny vibration of an idling engine (often only a few % of the old fixed
 *  scale) still fills the bar range instead of drawing a flat line. */
let peak = 0.02
function realTick(value: number): void {
  peak = Math.max(value, peak * 0.97, 0.02)
  const level = value / peak
  pushBar(0.15 + 0.75 * level + (Math.random() - 0.5) * 0.06)
}

function startTicking(): void {
  stopTicking()
  peak = 0.02
  // Fixed-rate sampling of the latest reading — the bars always advance,
  // even when the sensor value repeats or arrives irregularly.
  tickTimer = setInterval(() => {
    const value = props.magnitude
    if (value === null || value === undefined) decorativeTick()
    else realTick(value)
  }, 100)
}

function stopTicking(): void {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      bars.value = Array.from({ length: BAR_COUNT }, () => 0.08)
      startTicking()
    } else {
      stopTicking()
    }
  },
  { immediate: true },
)

onBeforeUnmount(stopTicking)
</script>

<template>
  <div class="waveform" :class="{ active }">
    <span
      v-for="(height, index) in bars"
      :key="index"
      class="bar"
      :style="{ height: `${height * 100}%` }"
    />
  </div>
</template>

<style scoped>
.waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 64px;
  padding: 0 var(--space-sm);
}

.bar {
  flex: 1;
  min-width: 2px;
  max-width: 6px;
  border-radius: 999px;
  background: var(--color-border);
  transition: height 0.12s ease;
}

.waveform.active .bar {
  background: var(--color-primary);
}
</style>
