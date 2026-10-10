<script setup lang="ts">
/**
 * One bike = one session: the shot checklist (walk-around order) plus the
 * guided camera. After each 使用這張 the camera jumps straight to the next
 * shot that still needs a photo, so a full walk-around is shutter → 使用 →
 * shutter → 使用 … without returning to this list.
 */
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'

import { storage } from '@/services/firebase/firebase'
import {
  trainingCaptureStoragePath,
  VEHICLE_TYPE_LABEL,
  type VehicleType,
  type TrainingSession,
} from '@/data/training/training-dataset.types'
import {
  guideAnnotationsFor,
  TRAINING_SHOT_PLAN_VERSION,
  TRAINING_STAGE_LABEL,
  trainingShotsFor,
  type TrainingShotDef,
} from '@/data/training/training-shots'
import {
  getSession,
  listSessionCaptures,
  newCaptureId,
  updateSession,
  withdrawCapture,
  type SessionCapture,
} from '@capture/services/capture.service'
import { uploadQueue } from '@capture/services/upload-queue'
import { rememberVehicleType } from '@capture/services/vehicle-type-pref'
import CameraScreen, { type CapturedShot } from './CameraScreen.vue'

const props = defineProps<{ sessionId: string; uid: string; autoStart?: boolean }>()
const emit = defineEmits<{ back: [] }>()

const session = ref<TrainingSession | null>(null)
const captures = ref<SessionCapture[]>([])
const thumbs = reactive<Record<string, string>>({})
const loading = ref(true)
const cameraIndex = ref<number | null>(null)
const toast = ref('')

const shots = computed(() => trainingShotsFor(session.value?.hasChain ?? false))

const queued = computed(() =>
  uploadQueue.entries.value.filter((e) => e.sessionId === props.sessionId),
)

function uploadedFor(shotId: string): SessionCapture[] {
  return captures.value.filter((c) => c.shotId === shotId)
}
function queuedFor(shotId: string) {
  return queued.value.filter((e) => e.shotId === shotId)
}
function takenCount(shotId: string): number {
  return uploadedFor(shotId).length + queuedFor(shotId).length
}
function isDone(shot: TrainingShotDef): boolean {
  return takenCount(shot.id) > 0 || !!session.value?.skippedShots[shot.id]
}

const doneCount = computed(() => shots.value.filter(isDone).length)
const missingRequired = computed(() => shots.value.filter((s) => !s.optional && !isDone(s)))

const stages = computed(() => {
  const groups: { stage: string; items: { shot: TrainingShotDef; index: number }[] }[] = []
  shots.value.forEach((shot, index) => {
    const label = TRAINING_STAGE_LABEL[shot.stage]
    let g = groups.find((x) => x.stage === label)
    if (!g) groups.push((g = { stage: label, items: [] }))
    g.items.push({ shot, index })
  })
  return groups
})

async function loadThumb(c: SessionCapture): Promise<void> {
  if (thumbs[c.id]) return
  try {
    thumbs[c.id] = await getDownloadURL(storageRef(storage, c.storagePath))
  } catch {
    /* thumbnail is cosmetic */
  }
}

async function reloadCaptures(): Promise<void> {
  captures.value = await listSessionCaptures(props.uid, props.sessionId)
  captures.value.forEach(loadThumb)
}

function loadErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code
  if (code === 'permission-denied') return '沒有讀取權限（伺服器存取規則可能尚未更新）。'
  if (code === 'unavailable') return '連不上伺服器，請確認網路。'
  return e instanceof Error ? e.message : '載入失敗'
}
const loadError = ref('')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    session.value = await getSession(props.sessionId)
    await reloadCaptures()
  } catch (e) {
    loadError.value = loadErrorMessage(e)
  } finally {
    loading.value = false
  }
}

const stopListening = uploadQueue.onUploaded((entry) => {
  if (entry.sessionId === props.sessionId) void reloadCaptures()
})
onBeforeUnmount(stopListening)

function flash(message: string): void {
  toast.value = message
  setTimeout(() => (toast.value = ''), 1800)
}

function openCamera(index: number): void {
  cameraIndex.value = index
}

function openNextMissing(): void {
  const idx = shots.value.findIndex((s) => !isDone(s))
  openCamera(idx === -1 ? 0 : idx)
}

/** Next not-yet-done shot after `from`, wrapping; null when all done. */
function nextMissingAfter(from: number): number | null {
  const n = shots.value.length
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n
    if (!isDone(shots.value[i])) return i
  }
  return null
}

function advanceFrom(index: number): void {
  const next = nextMissingAfter(index)
  if (next === null) {
    cameraIndex.value = null
    flash('這台車的拍攝項目都完成了')
  } else {
    cameraIndex.value = next
  }
}

async function clearSkip(shotId: string): Promise<void> {
  if (!session.value?.skippedShots[shotId]) return
  const skippedShots = { ...session.value.skippedShots }
  delete skippedShots[shotId]
  session.value.skippedShots = skippedShots
  await updateSession(props.sessionId, { skippedShots })
}

async function handleUse(captured: CapturedShot): Promise<void> {
  const index = cameraIndex.value
  const s = session.value
  if (index === null || !s) return
  const shot = shots.value[index]

  // Retake of a single-shot item replaces the earlier upload. The new photo
  // is already safe in IndexedDB before anything is withdrawn.
  const replaced = shot.repeatable ? [] : uploadedFor(shot.id)

  const id = newCaptureId()
  await uploadQueue.enqueue({
    id,
    blob: captured.frame.blob,
    doc: {
      sessionId: s.id,
      collectorUid: props.uid,
      vehicleModelId: s.vehicleModelId,
      vehicleModelLabel: s.vehicleModelLabel,
      vehicleType: s.vehicleType,
      shotId: shot.id,
      partKey: shot.partKey,
      view: shot.view,
      shotPlanVersion: TRAINING_SHOT_PLAN_VERSION,
      storagePath: trainingCaptureStoragePath(props.uid, s.id, id),
      width: captured.frame.width,
      height: captured.frame.height,
      guideAnnotations: guideAnnotationsFor(shot, s.vehicleType),
      annotations: null,
      quality: captured.quality,
      device: {
        userAgent: navigator.userAgent,
        videoWidth: captured.videoWidth,
        videoHeight: captured.videoHeight,
      },
      status: 'pending',
      rejectReason: null,
      capturedAtMs: Date.now(),
    },
  })
  void clearSkip(shot.id)
  for (const old of replaced) {
    withdrawCapture(old)
      .then(() => (captures.value = captures.value.filter((c) => c.id !== old.id)))
      .catch(() => undefined) // already reviewed → rules keep it; that's fine
  }

  if (shot.repeatable) flash('已加入，可繼續拍下一個改裝件')
  else advanceFrom(index)
}

async function handleSkip(reason: string): Promise<void> {
  const index = cameraIndex.value
  if (index === null || !session.value) return
  const shot = shots.value[index]
  const skippedShots = { ...session.value.skippedShots, [shot.id]: reason }
  session.value.skippedShots = skippedShots
  await updateSession(props.sessionId, { skippedShots })
  advanceFrom(index)
}

function step(delta: number): void {
  if (cameraIndex.value === null) return
  const n = shots.value.length
  cameraIndex.value = (cameraIndex.value + delta + n) % n
}

/** 速克達/檔車 only changes the guide frames; the model is classified later on the computer. */
async function setVehicleType(t: VehicleType): Promise<void> {
  if (!session.value || session.value.vehicleType === t) return
  session.value.vehicleType = t
  rememberVehicleType(t)
  await updateSession(props.sessionId, { vehicleType: t })
}

const sessionTitle = computed(() =>
  session.value ? session.value.vehicleModelLabel || '未分類車輛' : '載入中…',
)

async function complete(): Promise<void> {
  if (
    missingRequired.value.length &&
    !confirm(`還有 ${missingRequired.value.length} 個必拍項目未完成，仍要結束這台車嗎？`)
  ) {
    return
  }
  await updateSession(props.sessionId, { status: 'completed' })
  emit('back')
}

void load().then(() => {
  if (props.autoStart && session.value) openNextMissing()
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <button class="link" @click="emit('back')">‹ 車輛列表</button>
      <h1>{{ sessionTitle }}</h1>
      <p v-if="session" class="muted">
        {{ VEHICLE_TYPE_LABEL[session.vehicleType] }} · 完成 {{ doneCount }} / {{ shots.length }}
        <span v-if="queued.length"> · 待上傳 {{ queued.length }}</span>
        <span v-if="session.status === 'completed'"> · 已結束</span>
      </p>
      <div class="progress">
        <span :style="{ width: `${(doneCount / (shots.length || 1)) * 100}%` }"></span>
      </div>
    </header>

    <p v-if="loading" class="muted center">載入中…</p>

    <div v-else-if="loadError" class="card">
      <h2>載入失敗</h2>
      <p class="bad small">{{ loadError }}</p>
      <button class="btn primary" @click="load">重試</button>
    </div>

    <template v-else-if="session">
      <button class="btn primary block" @click="openNextMissing">
        {{
          doneCount === 0 ? '開始依序拍攝' : doneCount < shots.length ? '繼續拍下一個' : '從頭檢視'
        }}
      </button>

      <section v-for="g in stages" :key="g.stage" class="group">
        <h2>{{ g.stage }}</h2>
        <button
          v-for="{ shot, index } in g.items"
          :key="shot.id"
          class="shot-row"
          @click="openCamera(index)"
        >
          <span class="thumb">
            <img v-if="queuedFor(shot.id)[0]" :src="queuedFor(shot.id)[0].thumbUrl" alt="" />
            <img
              v-else-if="uploadedFor(shot.id)[0] && thumbs[uploadedFor(shot.id)[0].id]"
              :src="thumbs[uploadedFor(shot.id)[0].id]"
              alt=""
            />
          </span>
          <span class="shot-text">
            <strong>{{ shot.title }}</strong>
            <small v-if="session.skippedShots[shot.id]" class="muted"
              >不適用：{{ session.skippedShots[shot.id] }}</small
            >
            <small v-else-if="queuedFor(shot.id).some((e) => e.state === 'error')" class="bad"
              >上傳失敗，將自動重試</small
            >
            <small v-else-if="queuedFor(shot.id).length" class="muted">
              上傳中 {{ Math.round((queuedFor(shot.id)[0].progress ?? 0) * 100) }}%
            </small>
            <small v-else-if="uploadedFor(shot.id).length" class="good">
              已上傳{{ shot.repeatable ? ` ${uploadedFor(shot.id).length} 張` : '' }}
            </small>
            <small v-else class="muted">{{ shot.optional ? '選拍' : '必拍' }}</small>
          </span>
          <span class="state" :class="{ done: isDone(shot) }">{{ isDone(shot) ? '✓' : '›' }}</span>
        </button>
      </section>

      <button class="btn ghost block" @click="complete">結束這台車</button>
      <p v-if="session.notes" class="muted small">備註：{{ session.notes }}</p>
    </template>

    <CameraScreen
      v-if="cameraIndex !== null && session"
      :shot="shots[cameraIndex]"
      :vehicle-type="session.vehicleType"
      @vehicle-type="setVehicleType"
      :position="`${cameraIndex + 1} / ${shots.length}`"
      :already-taken="takenCount(shots[cameraIndex].id)"
      @close="cameraIndex = null"
      @use="handleUse"
      @skip="handleSkip"
      @prev="step(-1)"
      @next="step(1)"
    />

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.page-head h1 {
  margin: 6px 0 2px;
  font-size: 20px;
}

.progress {
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  margin-top: 8px;
  overflow: hidden;
}

.progress span {
  display: block;
  height: 100%;
  background: var(--ok);
}

.group h2 {
  font-size: 13px;
  color: var(--muted);
  margin: 18px 0 6px;
  font-weight: 600;
}

.shot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: inherit;
  text-align: left;
  font: inherit;
}

.thumb {
  width: 42px;
  height: 56px;
  border-radius: 6px;
  background: var(--line);
  overflow: hidden;
  flex: none;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shot-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shot-text strong {
  font-size: 15px;
  font-weight: 600;
}

.state {
  font-size: 18px;
  color: var(--muted);
}

.state.done {
  color: var(--ok);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 28px);
  transform: translateX(-50%);
  background: var(--ok);
  color: #04130a;
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 999px;
  z-index: 30;
}
</style>
