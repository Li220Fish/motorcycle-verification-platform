<script setup lang="ts">
/**
 * Bottom "measurement" card shared by all 3 Engine sessions (啟動/怠速/油門)
 * — replaces the old fixed-duration EngineCountdown. Behavior per this
 * pass's redesign: a short 3‑2‑1 pre-roll, then recording counts UP with no
 * automatic stop — the user ends it manually via "結束測量", which only
 * becomes enabled once `minDurationSeconds` has elapsed (unlimited maximum).
 * Purely presentational/timer state lives here; the parent owns the actual
 * audio/motion capture and decides when `completed`/`files` flip once its
 * own upload+save work finishes.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import EngineWaveform from './EngineWaveform.vue'
import EngineRecordedFileCard from './EngineRecordedFileCard.vue'

export interface RecordedFileInfo {
  kind: 'audio' | 'imu' | 'video'
  label: string
  filename: string
  durationSeconds: number
  sizeBytes: number
}

const props = withDefaults(
  defineProps<{
    minDurationSeconds: number
    instructionAt?: (elapsedSeconds: number) => string
    /** Real-time accelerometer magnitude (0..1, normalized), updated by the
     *  parent while recording — omit for an audio-only session. */
    magnitude?: number | null
    startLabel?: string
    /** Parent flips this true once its async stop/upload/save work for the
     *  current recording has finished. */
    completed?: boolean
    files?: RecordedFileInfo[]
  }>(),
  {
    instructionAt: undefined,
    magnitude: null,
    startLabel: '開始測量',
    completed: false,
    files: () => [],
  },
)

const emit = defineEmits<{
  recordingStart: []
  done: []
  remeasure: []
  /** User tapped the start button — parent gets first refusal (e.g. a mic
   *  permission check) before the countdown actually begins via `begin()`. */
  requestStart: []
}>()

type Phase = 'idle' | 'countdown' | 'recording' | 'saving'
const phase = ref<Phase>('idle')
const countdownValue = ref(3)
const elapsedSeconds = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null

function clearTimers(): void {
  if (countdownTimer) clearInterval(countdownTimer)
  if (recordingTimer) clearInterval(recordingTimer)
  countdownTimer = null
  recordingTimer = null
}

const minReached = computed(() => elapsedSeconds.value >= props.minDurationSeconds)
const remainingToMin = computed(() => Math.max(props.minDurationSeconds - elapsedSeconds.value, 0))
const elapsedLabel = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function beginRecording(): void {
  phase.value = 'recording'
  emit('recordingStart')
  recordingTimer = setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
}

function requestStart(): void {
  emit('requestStart')
}

/** Starts the 3‑2‑1 pre-roll. Called by the parent once it's confirmed
 *  recording can actually begin (e.g. mic permission granted). */
function begin(): void {
  clearTimers()
  phase.value = 'countdown'
  countdownValue.value = 3
  elapsedSeconds.value = 0
  countdownTimer = setInterval(() => {
    countdownValue.value -= 1
    if (countdownValue.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      beginRecording()
    }
  }, 1000)
}

function stopMeasuring(): void {
  if (!minReached.value) return
  clearTimers()
  phase.value = 'saving'
  emit('done')
}

/** Cancel mid-recording (user Cancel / app-interruption abort) — no `done`
 *  emitted, caller decides what screen to show next. */
function cancel(): void {
  clearTimers()
  phase.value = 'idle'
}

/** Back to the not-yet-started view — used after "重新測量". */
function reset(): void {
  clearTimers()
  elapsedSeconds.value = 0
  phase.value = 'idle'
}

function requestRemeasure(): void {
  reset()
  emit('remeasure')
}

defineExpose({ cancel, reset, begin })
onBeforeUnmount(clearTimers)

// Once the parent's async save resolves, drop the transient "saving" state
// — the `completed`/`files` props then drive the done view directly.
watch(
  () => props.completed,
  (done) => {
    if (done) phase.value = 'idle'
  },
)
</script>

<template>
  <div class="panel">
    <template v-if="completed && files.length > 0">
      <p class="section-label">已錄製檔案</p>
      <div class="file-list">
        <EngineRecordedFileCard
          v-for="file in files"
          :key="file.filename"
          :kind="file.kind"
          :filename="file.filename"
          :duration-seconds="file.durationSeconds"
          :size-bytes="file.sizeBytes"
        />
      </div>
      <button class="remeasure-btn" @click="requestRemeasure">↻ 重新測量</button>
    </template>

    <template v-else-if="phase === 'idle'">
      <PrimaryButton block @click="requestStart">{{ startLabel }}</PrimaryButton>
      <p class="min-hint">至少錄製 {{ minDurationSeconds }} 秒，不限最長時間</p>
    </template>

    <template v-else-if="phase === 'countdown'">
      <p class="countdown-number">{{ countdownValue > 0 ? countdownValue : '' }}</p>
    </template>

    <template v-else-if="phase === 'recording' || phase === 'saving'">
      <div class="recording-header">
        <span class="rec-dot" />
        <span class="rec-label">{{ phase === 'saving' ? '正在儲存…' : '正在測量中' }}</span>
        <span class="rec-elapsed">{{ elapsedLabel }}</span>
        <span class="rec-hint">（至少 {{ minDurationSeconds }} 秒）</span>
      </div>

      <EngineWaveform :active="phase === 'recording'" :magnitude="magnitude" />

      <p v-if="instructionAt && phase === 'recording'" class="live-instruction">
        {{ instructionAt(elapsedSeconds) }}
      </p>

      <PrimaryButton
        variant="danger"
        block
        :disabled="!minReached || phase === 'saving'"
        @click="stopMeasuring"
      >
        結束測量
      </PrimaryButton>
      <p v-if="!minReached" class="min-hint">還需 {{ remainingToMin }} 秒才能結束</p>
      <p v-else class="min-hint">不限最長時間，可隨時結束</p>
    </template>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.remeasure-btn {
  align-self: center;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
  padding: 4px 8px;
}

.min-hint {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.countdown-number {
  margin: 0;
  text-align: center;
  font-size: 56px;
  font-weight: 800;
  color: var(--color-primary);
  padding: var(--space-md) 0;
}

.recording-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.rec-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--color-danger);
  align-self: center;
}

.rec-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-danger);
}

.rec-elapsed {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.rec-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.live-instruction {
  margin: 0;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
}
</style>
