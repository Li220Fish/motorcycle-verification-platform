<script setup lang="ts">
/**
 * Engine Audio + IMU capture — Verification v2 (spec §23-§33). Replaces the
 * earlier 3 user-controlled-duration sessions (啟動/怠速/油門) with ONE fixed
 * 23.0-second synchronized Audio+IMU recording covering all 6 underlying
 * Inspection Items ENG-03..08: 0.0-8.0s Startup, 8.0-15.0s Idle, 15.0-23.0s
 * Rev, then a hard auto-stop — never user-extendable, never
 * early-stoppable (spec §24: "禁止：少錄完成/多錄/繼續錄製/User 自己決定停止
 * 時間"). This is NOT built on EngineMeasurementPanel.vue (that component is
 * deliberately user-controlled: adjustable minimum, manual "結束測量" stop —
 * still correct for EnvironmentCaptureSession.vue's old use case before that
 * capture flow was removed entirely, wrong here) — the fixed timeline below
 * follows the same "app alone drives an exact schedule" pattern already
 * used by ColdTouchCapture.vue for Step 39.
 *
 * Capture State (this component) ≠ Inspection Result (§27/§48): the moment
 * the 23s recording finishes, all 6 underlying items are placeholder-marked
 * `normal` (same convention as pure-photo items in VerificationItem.vue) so
 * the lockedOrder gate isn't blocked on Gemini latency;
 * `analyzeEngineSensorSessionV2` is then fired (not awaited) and overwrites
 * that placeholder with the real Gemini-graded / IMU-classified result once
 * it lands — ONE Gemini audio call for all 4 audio items (spec §28), IMU
 * classification stays fully deterministic (spec §31-§33).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Activity } from 'lucide-vue-next'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import EngineWaveform from './EngineWaveform.vue'
import EngineRecordedFileCard from './EngineRecordedFileCard.vue'
import type { RecordedFileInfo } from './EngineMeasurementPanel.vue'
import EnginePlacementGuide from './EnginePlacementGuide.vue'
import { audioRecorderService } from '@/services/media/audio-recorder.service'
import {
  computeMotionSummary,
  motionCaptureService,
} from '@/services/motion/motion-capture.service'
import type { MotionSample } from '@/services/motion/motion-capture.service'
import { storageService } from '@/services/firebase/storage.service'
import { analyzeEngineSensorSessionV2 } from '@/services/firebase/ai-analysis.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_SESSION_DURATION_MS,
  ENGINE_SESSION_ITEM_IDS,
  ENGINE_SESSION_PHASES,
  ENGINE_STARTUP_ITEM_IDS,
  engineSessionInstructionAt,
  inferTransmissionType,
  transmissionLabelFor,
} from '@/data/verification/engine-session'
import type { EngineTransmissionType } from '@/data/verification/engine-session'
import type { VerificationEvidence } from '@/types/verification-evidence'

const AUDIO_ITEM_IDS = [...ENGINE_STARTUP_ITEM_IDS, ENGINE_IDLE_ITEM_IDS[0], ENGINE_REV_ITEM_IDS[0]]
const IMU_ITEM_IDS = [ENGINE_IDLE_ITEM_IDS[1], ENGINE_REV_ITEM_IDS[1]]

const props = defineProps<{ verificationId: string }>()
const emit = defineEmits<{ advance: []; recordingActive: [boolean] }>()

const verificationStore = useVerificationStore()
const vehicleStore = useVehicleStore()

type Phase =
  | 'placement'
  | 'placement-precheck'
  | 'ready'
  | 'permission-denied'
  | 'recording'
  | 'completed'
  | 'capture-failed'

function allDone(): boolean {
  return ENGINE_SESSION_ITEM_IDS.every((id) => !!verificationStore.answers[id])
}

const phase = ref<Phase>(allDone() ? 'completed' : 'placement')
const showCancelConfirm = ref(false)
const isActivelyRecording = ref(false)
const elapsedMs = ref(0)
const errorMessage = ref('')
const sessionFiles = ref<RecordedFileInfo[]>([])
const liveMagnitude = ref<number | null>(null)

let timer: ReturnType<typeof setInterval> | null = null
let recordingStartedAt = 0
let motionSamples: MotionSample[] = []

function clearTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

function setRecordingActive(active: boolean): void {
  isActivelyRecording.value = active
  emit('recordingActive', active)
}

// --- Vehicle type (needed for the placement diagram before recording) ----
const vehicleType = ref<EngineTransmissionType | null>(
  inferTransmissionType(vehicleStore.currentVehicle?.transmission),
)
function pickVehicleType(type: EngineTransmissionType): void {
  vehicleType.value = type
  const vehicleId = verificationStore.currentVerification?.vehicleId
  if (vehicleId) {
    vehicleStore
      .updateVehicle(vehicleId, { transmission: transmissionLabelFor(type) })
      .catch(() => {})
  }
}

const motionSupported = ref(motionCaptureService.isSupported())

function handlePlacementConfirmed(): void {
  phase.value = 'placement-precheck'
  setTimeout(() => {
    phase.value = 'ready'
  }, 1200)
}

// --- Upload/save helpers --------------------------------------------------
async function uploadAudio(itemIdForPath: string, blob: Blob): Promise<string | undefined> {
  try {
    return await storageService.uploadEvidenceFile(props.verificationId, itemIdForPath, blob, 'aac')
  } catch {
    return undefined
  }
}

async function saveAudioEvidence(itemId: string, remoteUrl: string | undefined): Promise<void> {
  const evidence: VerificationEvidence = {
    id: crypto.randomUUID(),
    verificationId: props.verificationId,
    itemId,
    type: 'audio',
    remoteUrl,
    createdAt: Date.now(),
    captureSource: 'camera',
    captureTimestamp: Date.now(),
    metadata: { sessionType: 'engine-session-v2', durationMs: ENGINE_SESSION_DURATION_MS },
  }
  await verificationStore.addEvidence(evidence)
  await verificationStore.saveAnswer(itemId, 'normal')
}

/** Uploads the FULL 0-23s sample array once, then a duplicate `imu`-typed
 * Evidence per item id pointing at that same file (mirrors saveAudioEvidence
 * duplicating one audio blob across 4 items) — the Trusted Backend slices
 * idle (8-15s) / rev (15-23s) segments out of this one array using the
 * embedded `phases` boundaries, never re-deriving timing itself (spec §27). */
async function saveMotionEvidence(samples: MotionSample[]): Promise<number> {
  const hasSamples = samples.length > 0
  const summary = computeMotionSummary(samples)

  let remoteUrl: string | undefined
  let sizeBytes = 0
  if (hasSamples) {
    const sessionJson = {
      schemaVersion: 2,
      sessionType: 'engine-session-v2',
      durationMs: ENGINE_SESSION_DURATION_MS,
      phases: ENGINE_SESSION_PHASES,
      placement: vehicleType.value === 'scooter' ? 'scooter_floorboard' : 'manual_front_seat',
      orientation: 'screen_up_top_toward_front',
      targetSampleRateHz: 100,
      samples: samples.map((sample) => ({
        tMs: sample.timestamp,
        ax: sample.x,
        ay: sample.y,
        az: sample.z,
        gx: sample.gx,
        gy: sample.gy,
        gz: sample.gz,
      })),
    }
    const blob = new Blob([JSON.stringify(sessionJson)], { type: 'application/json' })
    sizeBytes = blob.size
    try {
      remoteUrl = await storageService.uploadEvidenceFile(
        props.verificationId,
        IMU_ITEM_IDS[0],
        blob,
        'json',
      )
    } catch {
      remoteUrl = undefined
    }
  }

  for (const itemId of IMU_ITEM_IDS) {
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId,
      type: 'imu',
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'manual',
      captureTimestamp: Date.now(),
      metadata: hasSamples ? { ...summary } : { sampleCount: 0, unsupported: true },
    }
    await verificationStore.addEvidence(evidence)
    await verificationStore.saveAnswer(itemId, 'normal')
  }
  return sizeBytes
}

// --- Recording (single fixed 23.0s session) ------------------------------
function updateLiveMagnitude(sample: MotionSample): void {
  const magnitude = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2)
  const deviation = Math.abs(magnitude - 9.8)
  liveMagnitude.value = Math.min(1, deviation / 5)
}

async function abortAsFailed(): Promise<void> {
  clearTimer()
  setRecordingActive(false)
  liveMagnitude.value = null
  audioRecorderService.stop().catch(() => {})
  motionCaptureService.stop()
  phase.value = 'capture-failed'
}

async function finishRecording(): Promise<void> {
  clearTimer()
  motionCaptureService.stop()
  setRecordingActive(false)
  liveMagnitude.value = null
  try {
    const result = await audioRecorderService.stop()
    const remoteUrl = await uploadAudio(AUDIO_ITEM_IDS[0], result.blob)
    for (const itemId of AUDIO_ITEM_IDS) {
      await saveAudioEvidence(itemId, remoteUrl)
    }
    const imuSizeBytes = await saveMotionEvidence(motionSamples)
    sessionFiles.value = [
      {
        kind: 'audio',
        label: '引擎音訊（啟動＋怠速＋油門）',
        filename: `engine_audio_${Date.now()}.aac`,
        durationSeconds: Math.round(result.durationMs / 1000),
        sizeBytes: result.blob.size,
      },
      {
        kind: 'imu',
        label: '引擎震動（怠速＋油門）',
        filename: `engine_imu_${Date.now()}.json`,
        durationSeconds: Math.round(result.durationMs / 1000),
        sizeBytes: imuSizeBytes,
      },
    ]
    phase.value = 'completed'
    // Fire-and-forget: the Trusted Backend overwrites the placeholder
    // `normal` answers with the real Gemini-graded / IMU-classified result
    // once it lands. Not awaited — Gemini latency should never block the
    // capture flow from advancing.
    analyzeEngineSensorSessionV2(props.verificationId).catch((error) =>
      console.error('[AI analysis] analyzeEngineSensorSessionV2 trigger failed:', error),
    )
  } catch {
    await abortAsFailed()
    return
  }
  motionSamples = []
}

async function handleRequestStart(): Promise<void> {
  errorMessage.value = ''
  try {
    await audioRecorderService.checkPermission()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : ''
    phase.value = 'permission-denied'
    return
  }

  motionSamples = []
  try {
    await audioRecorderService.start()
    setRecordingActive(true)
  } catch {
    await abortAsFailed()
    return
  }
  if (motionSupported.value) {
    try {
      await motionCaptureService.start((sample) => {
        motionSamples.push(sample)
        updateLiveMagnitude(sample)
      })
    } catch {
      motionSupported.value = false
    }
  }

  recordingStartedAt = Date.now()
  elapsedMs.value = 0
  phase.value = 'recording'
  timer = setInterval(() => {
    elapsedMs.value = Date.now() - recordingStartedAt
    if (elapsedMs.value >= ENGINE_SESSION_DURATION_MS) {
      clearTimer()
      void finishRecording()
    }
  }, 100)
}

// --- Cancel (2-step confirm, only allowed action mid-recording) ----------
function requestCancel(): void {
  showCancelConfirm.value = true
}
function dismissCancelConfirm(): void {
  showCancelConfirm.value = false
}
async function confirmCancel(): Promise<void> {
  showCancelConfirm.value = false
  clearTimer()
  setRecordingActive(false)
  liveMagnitude.value = null
  audioRecorderService.stop().catch(() => {})
  motionCaptureService.stop()
  phase.value = 'ready'
}

// --- Interruption handling (app background, not a fabricated AI result) --
function handleVisibilityChange(): void {
  if (document.hidden && isActivelyRecording.value) {
    void abortAsFailed()
  }
}

function retryAfterFailure(): void {
  errorMessage.value = ''
  phase.value = 'ready'
}

function formatElapsed(): string {
  const totalSeconds = Math.floor(elapsedMs.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  clearTimer()
  motionCaptureService.stop()
})
</script>

<template>
  <div class="engine-flow">
    <!-- Phone placement (before the single 23s recording) -->
    <template v-if="phase === 'placement'">
      <h2>放置手機</h2>
      <template v-if="!vehicleType">
        <p class="main-copy">請選擇車輛類型</p>
        <div class="type-pick">
          <PrimaryButton variant="secondary" block @click="pickVehicleType('scooter')"
            >速可達</PrimaryButton
          >
          <PrimaryButton variant="secondary" block @click="pickVehicleType('manual')"
            >檔車</PrimaryButton
          >
        </div>
      </template>
      <template v-else>
        <EnginePlacementGuide :vehicle-type="vehicleType" />
        <PrimaryButton block @click="handlePlacementConfirmed">我已放好</PrimaryButton>
      </template>
    </template>

    <template v-else-if="phase === 'placement-precheck'">
      <p class="checking">正在確認手機狀態…</p>
      <ul class="tips">
        <li>✓ 手機方向</li>
        <li>✓ 手機保持穩定</li>
        <li>✓ 麥克風已準備</li>
        <li v-if="motionSupported">✓ 動作感測器已準備</li>
      </ul>
    </template>

    <!-- Ready / Recording / Completed: single 23.0s session -->
    <template v-else-if="phase === 'ready' || phase === 'recording' || phase === 'completed'">
      <div class="top-card">
        <div class="top-card-header">
          <div class="icon-chip"><Activity :size="20" /></div>
          <div class="top-card-titles">
            <p class="eyebrow">目前檢測項目</p>
            <h2>引擎檢測</h2>
          </div>
        </div>
        <p class="subhead">共 23 秒，時間由系統自動控制</p>
        <p class="main-copy">
          依畫面提示發動引擎、保持怠速、再依提示拉動油門，系統會自動判斷各階段並在 23 秒後自動停止。
        </p>
        <div class="tips-box">
          <ul class="tips">
            <li>手機放穩，不要手持或移動</li>
            <li>麥克風不要被遮住</li>
            <li>周圍盡量保持安靜</li>
          </ul>
        </div>
      </div>

      <div class="diagram-card">
        <EnginePlacementGuide v-if="vehicleType" :vehicle-type="vehicleType" />
      </div>

      <div class="panel-card">
        <template v-if="phase === 'ready'">
          <PrimaryButton block @click="handleRequestStart">開始引擎檢測</PrimaryButton>
        </template>

        <template v-else-if="phase === 'recording'">
          <div class="recording-header">
            <span class="rec-dot" />
            <span class="rec-label">正在檢測中</span>
            <span class="rec-elapsed">{{ formatElapsed() }} / 00:23</span>
          </div>
          <EngineWaveform :active="true" :magnitude="liveMagnitude" />
          <p class="live-instruction">{{ engineSessionInstructionAt(elapsedMs / 1000) }}</p>
          <button class="cancel-btn" @click="requestCancel">取消</button>
        </template>

        <template v-else-if="phase === 'completed'">
          <p class="section-label">已錄製檔案</p>
          <div class="file-list">
            <EngineRecordedFileCard
              v-for="file in sessionFiles"
              :key="file.filename"
              :kind="file.kind"
              :filename="file.filename"
              :duration-seconds="file.durationSeconds"
              :size-bytes="file.sizeBytes"
            />
          </div>
          <PrimaryButton block @click="emit('advance')">完成引擎檢測</PrimaryButton>
        </template>
      </div>
    </template>

    <template v-else-if="phase === 'permission-denied'">
      <h2>需要麥克風權限</h2>
      <p class="main-copy">引擎檢測需要錄製聲音。請允許 MotoVerify 使用麥克風。</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <PrimaryButton block @click="phase = 'ready'">允許麥克風</PrimaryButton>
    </template>

    <template v-else-if="phase === 'capture-failed'">
      <h2>本次檢測已中斷</h2>
      <p class="main-copy">請重新進行本次檢測。</p>
      <PrimaryButton block @click="retryAfterFailure">重新開始</PrimaryButton>
    </template>

    <div v-if="showCancelConfirm" class="confirm-overlay">
      <div class="confirm-card">
        <p>確定要取消本次檢測嗎？</p>
        <p class="confirm-sub">本次錄音不會保存。</p>
        <div class="confirm-actions">
          <PrimaryButton variant="secondary" block @click="dismissCancelConfirm"
            >返回</PrimaryButton
          >
          <PrimaryButton variant="danger" block @click="confirmCancel">取消本次檢測</PrimaryButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.engine-flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.top-card,
.diagram-card,
.panel-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.top-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.icon-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-primary);
}

.top-card-titles {
  flex: 1;
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-disabled);
}

h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.subhead {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-danger);
}

.main-copy {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.5;
}

.tips-box {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.tips li::before {
  content: '✓ ';
  color: var(--color-primary);
}

.checking {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: var(--space-lg) 0;
}

.type-pick {
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

.live-instruction {
  margin: 0;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
}

.error-text {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger);
}

.cancel-btn {
  align-self: center;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(15, 23, 42, 0.5);
}

.confirm-card {
  width: 100%;
  max-width: 320px;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  text-align: center;
}

.confirm-card p {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.confirm-sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}
</style>
