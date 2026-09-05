<script setup lang="ts">
/**
 * Engine Audio + IMU capture, consolidated into 3 User-facing Sessions
 * (啟動/怠速/油門) over the 6 underlying Inspection Items ENG-03..08 — see
 * MotoVerify_Engine_Audio_IMU_UI_Agent_Implementation.md (UI/UX) and
 * MotoVerify_Engine_Audio_IMU_Technical_Implementation.md (Audio/IMU
 * pipeline, wired to the Trusted Backend — functions/src/services/
 * engine-sensor-session.service.ts).
 *
 * Screen layout (per this pass's redesign): every session screen is one
 * persistent card split into 3 parts — a header (current task + tips), a
 * diagram (phone placement), and a measurement panel (EngineMeasurementPanel)
 * whose own internal state carries idle → countdown → recording → done. The
 * old fixed-duration auto-stop is gone: recording only requires a minimum
 * duration and ends when the user taps "結束測量" (unlimited maximum).
 *
 * Capture State (this component) ≠ Inspection Result (§27/§48): the moment
 * a session's capture finishes, both underlying items are placeholder-
 * marked `normal` (same convention as pure-photo items in
 * VerificationItem.vue) so the lockedOrder gate isn't blocked on Gemini
 * latency; `analyzeEngineSensorSession` is then fired (not awaited) and
 * overwrites that placeholder with the real Gemini-graded / IMU-classified
 * result once it lands.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Wind, Gauge, Rocket } from 'lucide-vue-next'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import EngineMeasurementPanel from './EngineMeasurementPanel.vue'
import type { RecordedFileInfo } from './EngineMeasurementPanel.vue'
import EnginePlacementGuide from './EnginePlacementGuide.vue'
import { audioRecorderService } from '@/services/media/audio-recorder.service'
import {
  computeMotionSummary,
  motionCaptureService,
} from '@/services/motion/motion-capture.service'
import type { MotionSample } from '@/services/motion/motion-capture.service'
import { storageService } from '@/services/firebase/storage.service'
import { analyzeEngineSensorSession } from '@/services/firebase/ai-analysis.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_STARTUP_ITEM_IDS,
  inferTransmissionType,
  revInstructionAt,
  transmissionLabelFor,
} from '@/data/verification/engine-session'
import type { EngineTransmissionType } from '@/data/verification/engine-session'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{ verificationId: string }>()
const emit = defineEmits<{ advance: []; recordingActive: [boolean] }>()

const verificationStore = useVerificationStore()
const vehicleStore = useVehicleStore()

type SessionKind = 'startup' | 'idle' | 'rev'
type Phase =
  | 'startup'
  | 'startup-permission-denied'
  | 'placement'
  | 'placement-precheck'
  | 'idle'
  | 'rev'
  | 'completed'
  | 'capture-failed'

function pairDone(ids: readonly string[]): boolean {
  return ids.every((id) => !!verificationStore.answers[id])
}

function initialPhase(): Phase {
  if (!pairDone(ENGINE_STARTUP_ITEM_IDS)) return 'startup'
  if (!pairDone(ENGINE_IDLE_ITEM_IDS)) return 'placement'
  if (!pairDone(ENGINE_REV_ITEM_IDS)) return 'rev'
  return 'completed'
}

const phase = ref<Phase>(initialPhase())
const failedFromSession = ref<SessionKind | null>(null)
const showCancelConfirm = ref(false)
const panelRef = ref<InstanceType<typeof EngineMeasurementPanel> | null>(null)
const isActivelyRecording = ref(false)

function setPhase(next: Phase): void {
  phase.value = next
}

function setRecordingActive(active: boolean): void {
  isActivelyRecording.value = active
  emit('recordingActive', active)
}

// --- Vehicle type (spec §34) ---------------------------------------------
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

// --- Per-session "done" state shown by the measurement panel -------------
const sessionCompleted = ref(false)
const sessionFiles = ref<RecordedFileInfo[]>([])
/** Real-time accelerometer-magnitude sample (0..1, normalized) — drives
 *  EngineWaveform's bars during idle/rev; null for the audio-only startup
 *  session, which has no live level source (see EngineWaveform.vue). */
const liveMagnitude = ref<number | null>(null)

function resetSessionDoneState(): void {
  sessionCompleted.value = false
  sessionFiles.value = []
  liveMagnitude.value = null
}

// --- Audio/motion capture plumbing ---------------------------------------
let motionSamples: MotionSample[] = []

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
    metadata: {},
  }
  await verificationStore.addEvidence(evidence)
  await verificationStore.saveAnswer(itemId, 'normal')
}

/** Uploads the raw sample JSON to Storage (Technical spec §37/§38: "不要把
 *  數千筆 Samples 寫 Firestore array... 保存 Firebase Storage JSON") and
 *  saves an `imu`-typed Evidence pointing at it, so the backend's
 *  deterministic ImuPreprocessor/FeatureExtractor/StabilityClassifier
 *  (functions/src/imu/) has real per-sample data to work with — the
 *  Firestore-side summary (avgMagnitude/stddevMagnitude) stays too, purely
 *  for this component's own no-signal fallback UI. Returns the uploaded
 *  blob's size so the "已錄製檔案" card can show it. */
async function saveMotionEvidence(
  itemId: string,
  samples: MotionSample[],
  sessionType: 'idle' | 'rev',
  durationMs: number,
): Promise<number> {
  const hasSamples = samples.length > 0
  const summary = computeMotionSummary(samples)

  let remoteUrl: string | undefined
  let sizeBytes = 0
  if (hasSamples) {
    const sessionJson = {
      schemaVersion: 1,
      sessionType,
      durationMs,
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
        itemId,
        blob,
        'json',
      )
    } catch {
      remoteUrl = undefined
    }
  }

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
  return sizeBytes
}

// --- Startup session (audio only, 2 items) -------------------------------
const STARTUP_MIN_SECONDS = 8

async function handleStartupRequestStart(): Promise<void> {
  try {
    await audioRecorderService.checkPermission()
    panelRef.value?.begin()
  } catch {
    // The 'startup-permission-denied' screen already carries its own
    // friendly copy (spec §16/§36) — surfacing the raw error message too
    // (e.g. "Microphone permission was denied.") would defeat the point of
    // having replaced technical strings with plain-language copy.
    setPhase('startup-permission-denied')
  }
}

async function handleStartupRecordingStart(): Promise<void> {
  try {
    await audioRecorderService.start()
    setRecordingActive(true)
  } catch {
    await abortAsFailed('startup')
  }
}

async function handleStartupDone(): Promise<void> {
  try {
    const result = await audioRecorderService.stop()
    setRecordingActive(false)
    const remoteUrl = await uploadAudio(ENGINE_STARTUP_ITEM_IDS[0], result.blob)
    await saveAudioEvidence(ENGINE_STARTUP_ITEM_IDS[0], remoteUrl)
    await saveAudioEvidence(ENGINE_STARTUP_ITEM_IDS[1], remoteUrl)
    sessionFiles.value = [
      {
        kind: 'audio',
        label: '啟動音訊',
        filename: `startup_audio_${Date.now()}.aac`,
        durationSeconds: Math.round(result.durationMs / 1000),
        sizeBytes: result.blob.size,
      },
    ]
    sessionCompleted.value = true
    // Fire-and-forget: the Trusted Backend overwrites the placeholder
    // `normal` answers with the real Gemini-graded result once it lands
    // (functions/src/services/engine-sensor-session.service.ts). Not
    // awaited — Gemini latency should never block the capture flow from
    // advancing (spec's own "資料已完成收集，正在進行分析" allows this).
    analyzeEngineSensorSession(props.verificationId, 'startup').catch(() => {})
  } catch {
    await abortAsFailed('startup')
  }
}

function handleStartupRemeasure(): void {
  resetSessionDoneState()
}

// --- Idle / Rev sessions (audio + motion, 2 items each) ------------------
/** Coarse visual-only normalization of accelerometer magnitude into 0..1 for
 *  EngineWaveform's bars — NOT the backend's real stability feature
 *  extraction (functions/src/imu/imu-feature-extractor.ts owns that); this
 *  is purely "is the sensor picking up motion" live feedback. */
function updateLiveMagnitude(sample: MotionSample): void {
  const magnitude = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2)
  const deviation = Math.abs(magnitude - 9.8)
  liveMagnitude.value = Math.min(1, deviation / 5)
}

async function handleSharedRecordingStart(): Promise<void> {
  motionSamples = []
  try {
    await audioRecorderService.start()
    setRecordingActive(true)
  } catch {
    await abortAsFailed(phase.value === 'idle' ? 'idle' : 'rev')
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
}

async function finishSharedCapture(
  audioItemId: string,
  motionItemId: string,
  sessionType: 'idle' | 'rev',
): Promise<void> {
  motionCaptureService.stop()
  setRecordingActive(false)
  liveMagnitude.value = null
  try {
    const result = await audioRecorderService.stop()
    const remoteUrl = await uploadAudio(audioItemId, result.blob)
    await saveAudioEvidence(audioItemId, remoteUrl)
    const imuSizeBytes = await saveMotionEvidence(
      motionItemId,
      motionSamples,
      sessionType,
      result.durationMs,
    )
    sessionFiles.value = [
      {
        kind: 'audio',
        label: sessionType === 'idle' ? '怠速音訊' : '油門音訊',
        filename: `${sessionType}_audio_${Date.now()}.aac`,
        durationSeconds: Math.round(result.durationMs / 1000),
        sizeBytes: result.blob.size,
      },
      {
        kind: 'imu',
        label: sessionType === 'idle' ? '怠速震動' : '油門震動',
        filename: `${sessionType}_imu_${Date.now()}.json`,
        durationSeconds: Math.round(result.durationMs / 1000),
        sizeBytes: imuSizeBytes,
      },
    ]
  } catch {
    await abortAsFailed(sessionType)
    return
  }
  motionSamples = []
}

async function handleIdleDone(): Promise<void> {
  await finishSharedCapture(ENGINE_IDLE_ITEM_IDS[0], ENGINE_IDLE_ITEM_IDS[1], 'idle')
  if (phase.value !== 'capture-failed') {
    sessionCompleted.value = true
    analyzeEngineSensorSession(props.verificationId, 'idle').catch(() => {})
  }
}

async function handleRevDone(): Promise<void> {
  await finishSharedCapture(ENGINE_REV_ITEM_IDS[0], ENGINE_REV_ITEM_IDS[1], 'rev')
  if (phase.value !== 'capture-failed') {
    sessionCompleted.value = true
    analyzeEngineSensorSession(props.verificationId, 'rev').catch(() => {})
  }
}

function handleIdleRemeasure(): void {
  resetSessionDoneState()
}
function handleRevRemeasure(): void {
  resetSessionDoneState()
}

/** Idle/Rev never pre-check mic permission before the countdown (only
 *  Startup does — spec's original reasoning: it's the first mic use in the
 *  whole flow, worth checking before drawing the user through a countdown
 *  into a permission wall); a denial here surfaces via abortAsFailed like
 *  any other capture failure, same as before this redesign. */
function handleIdleOrRevRequestStart(): void {
  panelRef.value?.begin()
}

function handlePlacementConfirmed(): void {
  setPhase('placement-precheck')
  setTimeout(() => {
    resetSessionDoneState()
    setPhase('idle')
  }, 1200)
}

function advanceFromIdle(): void {
  resetSessionDoneState()
  setPhase('rev')
}
function advanceFromRev(): void {
  resetSessionDoneState()
  setPhase('completed')
}

// --- Cancel (spec §9/§29 — only allowed action mid-recording, 2-step confirm) ---
function requestCancel(): void {
  showCancelConfirm.value = true
}
function dismissCancelConfirm(): void {
  showCancelConfirm.value = false
}
async function confirmCancel(): Promise<void> {
  showCancelConfirm.value = false
  panelRef.value?.cancel()
  setRecordingActive(false)
  liveMagnitude.value = null
  audioRecorderService.stop().catch(() => {})
  motionCaptureService.stop()
}

// --- Interruption handling (spec §30/§31 — app background, not a fabricated AI result) ---
async function abortAsFailed(session: SessionKind): Promise<void> {
  panelRef.value?.cancel()
  setRecordingActive(false)
  liveMagnitude.value = null
  audioRecorderService.stop().catch(() => {})
  motionCaptureService.stop()
  failedFromSession.value = session
  setPhase('capture-failed')
}

function handleVisibilityChange(): void {
  if (document.hidden && isActivelyRecording.value) {
    const session: SessionKind =
      phase.value === 'startup' ? 'startup' : phase.value === 'idle' ? 'idle' : 'rev'
    void abortAsFailed(session)
  }
}

function retryAfterFailure(): void {
  const session = failedFromSession.value
  failedFromSession.value = null
  resetSessionDoneState()
  if (session === 'startup') setPhase('startup')
  else if (session === 'idle') setPhase('idle')
  else setPhase('rev')
}

const sessionMeta = computed(() => {
  switch (phase.value) {
    case 'startup':
      return { index: 1, icon: Rocket, title: '啟動檢測', minSeconds: STARTUP_MIN_SECONDS }
    case 'idle':
      return { index: 2, icon: Wind, title: '怠速檢測', minSeconds: 15 }
    case 'rev':
      return { index: 3, icon: Gauge, title: '油門檢測', minSeconds: 10 }
    default:
      return { index: 1, icon: Rocket, title: '', minSeconds: 0 }
  }
})

onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  motionCaptureService.stop()
})
</script>

<template>
  <div class="engine-flow">
    <!-- Session 1: Startup -->
    <template v-if="phase === 'startup'">
      <div class="top-card">
        <div class="top-card-header">
          <div class="icon-chip"><Rocket :size="20" /></div>
          <div class="top-card-titles">
            <p class="eyebrow">目前檢測項目</p>
            <h2>啟動檢測</h2>
          </div>
          <span class="session-badge">Session {{ sessionMeta.index }} / 3</span>
        </div>
        <p class="subhead">請先不要發動車輛</p>
        <p class="main-copy">將手機放在車輛旁的穩定位置，接著依畫面提示發動車輛。</p>
        <div class="tips-box">
          <ul class="tips">
            <li>手機放穩，不要手持</li>
            <li>麥克風不要被遮住</li>
            <li>周圍盡量保持安靜</li>
          </ul>
        </div>
      </div>

      <div class="diagram-card">
        <div class="simple-diagram">
          <span class="diagram-emoji">🏍️📱</span>
          <p class="diagram-caption">手機平放在車輛旁穩定平面，不要手持</p>
        </div>
      </div>

      <div class="panel-card">
        <EngineMeasurementPanel
          ref="panelRef"
          :min-duration-seconds="STARTUP_MIN_SECONDS"
          start-label="開始啟動檢測"
          :completed="sessionCompleted"
          :files="sessionFiles"
          @request-start="handleStartupRequestStart"
          @recording-start="handleStartupRecordingStart"
          @done="handleStartupDone"
          @remeasure="handleStartupRemeasure"
        />
        <button v-if="isActivelyRecording" class="cancel-btn" @click="requestCancel">取消</button>
        <PrimaryButton v-if="sessionCompleted" block @click="setPhase('placement')"
          >下一步：放置手機</PrimaryButton
        >
      </div>
    </template>

    <template v-else-if="phase === 'startup-permission-denied'">
      <h2>需要麥克風權限</h2>
      <p class="main-copy">引擎檢測需要錄製聲音。請允許 MotoVerify 使用麥克風。</p>
      <PrimaryButton block @click="setPhase('startup')">允許麥克風</PrimaryButton>
    </template>

    <!-- Phone placement (before Session 2) -->
    <template v-else-if="phase === 'placement'">
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

    <!-- Session 2: Idle -->
    <template v-else-if="phase === 'idle'">
      <div class="top-card">
        <div class="top-card-header">
          <div class="icon-chip"><Wind :size="20" /></div>
          <div class="top-card-titles">
            <p class="eyebrow">目前檢測項目</p>
            <h2>怠速檢測</h2>
          </div>
          <span class="session-badge">Session {{ sessionMeta.index }} / 3</span>
        </div>
        <p class="main-copy">請保持車輛怠速運轉，系統將同時分析引擎聲音與震動穩定度。</p>
        <div class="tips-box">
          <ul class="tips">
            <li>請將手機固定放置於指定位置，並保持不動</li>
            <li>保持車輛在怠速狀態，錄製至少 15 秒</li>
            <li>過程中請勿觸碰手機，避免影響數據</li>
          </ul>
        </div>
      </div>

      <div class="diagram-card">
        <EnginePlacementGuide v-if="vehicleType" :vehicle-type="vehicleType" />
      </div>

      <div class="panel-card">
        <EngineMeasurementPanel
          ref="panelRef"
          :min-duration-seconds="15"
          :magnitude="liveMagnitude"
          start-label="開始 15 秒檢測"
          :completed="sessionCompleted"
          :files="sessionFiles"
          @request-start="handleIdleOrRevRequestStart"
          @recording-start="handleSharedRecordingStart"
          @done="handleIdleDone"
          @remeasure="handleIdleRemeasure"
        />
        <button v-if="isActivelyRecording" class="cancel-btn" @click="requestCancel">取消</button>
        <PrimaryButton v-if="sessionCompleted" block @click="advanceFromIdle"
          >下一步：油門檢測</PrimaryButton
        >
      </div>
    </template>

    <!-- Session 3: Rev -->
    <template v-else-if="phase === 'rev'">
      <div class="top-card">
        <div class="top-card-header">
          <div class="icon-chip"><Gauge :size="20" /></div>
          <div class="top-card-titles">
            <p class="eyebrow">目前檢測項目</p>
            <h2>油門檢測</h2>
          </div>
          <span class="session-badge">Session {{ sessionMeta.index }} / 3</span>
        </div>
        <p class="main-copy">保持手機原位。接下來依畫面提示適度轉動油門。</p>
        <p class="safety-note">請確認車輛保持靜止，並在安全環境中進行。</p>
        <div class="tips-box">
          <ul class="tips">
            <li>手機保持原位，不要移動</li>
            <li>依畫面提示適度轉動油門，再回到怠速</li>
            <li>錄製至少 10 秒</li>
          </ul>
        </div>
      </div>

      <div class="diagram-card">
        <EnginePlacementGuide v-if="vehicleType" :vehicle-type="vehicleType" />
      </div>

      <div class="panel-card">
        <EngineMeasurementPanel
          ref="panelRef"
          :min-duration-seconds="10"
          :magnitude="liveMagnitude"
          :instruction-at="revInstructionAt"
          start-label="開始 10 秒檢測"
          :completed="sessionCompleted"
          :files="sessionFiles"
          @request-start="handleIdleOrRevRequestStart"
          @recording-start="handleSharedRecordingStart"
          @done="handleRevDone"
          @remeasure="handleRevRemeasure"
        />
        <button v-if="isActivelyRecording" class="cancel-btn" @click="requestCancel">取消</button>
        <PrimaryButton v-if="sessionCompleted" block @click="advanceFromRev"
          >完成引擎檢測</PrimaryButton
        >
      </div>
    </template>

    <template v-else-if="phase === 'completed'">
      <p class="done-mark">✓ 引擎檢測完成</p>
      <ul class="summary-list">
        <li>✓ 啟動檢測</li>
        <li>✓ 怠速檢測</li>
        <li>✓ 油門檢測</li>
      </ul>
      <PrimaryButton block @click="emit('advance')">繼續驗車</PrimaryButton>
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

.session-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
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

.safety-note {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
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

.simple-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.diagram-emoji {
  font-size: 40px;
}

.diagram-caption {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
}

.checking {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: var(--space-lg) 0;
}

.done-mark {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-success);
  text-align: center;
}

.summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-success);
  text-align: center;
}

.type-pick {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
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
