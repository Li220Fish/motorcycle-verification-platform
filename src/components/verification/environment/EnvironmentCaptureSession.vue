<script setup lang="ts">
/**
 * Step 3 — 驗車環境檢測 (Environment Calibration Session), Environment/
 * Cold-State spec PART A. A single 10-15s 360° environment video (+ its own
 * audio track) feeding `analyzeEnvironmentSession` — capture UI only follows
 * the same 3-part card layout and min-duration/user-stops measurement panel
 * already built for the Engine sessions (EngineMeasurementPanel.vue), reused
 * as-is rather than duplicated.
 */
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { Compass } from 'lucide-vue-next'
import EngineMeasurementPanel from '@/components/verification/engine/EngineMeasurementPanel.vue'
import type { RecordedFileInfo } from '@/components/verification/engine/EngineMeasurementPanel.vue'
import { videoRecorderService } from '@/services/media/video-recorder.service'
import { motionCaptureService } from '@/services/motion/motion-capture.service'
import type { MotionSample } from '@/services/motion/motion-capture.service'
import { storageService } from '@/services/firebase/storage.service'
import { analyzeEnvironmentSession } from '@/services/firebase/ai-analysis.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{ verificationId: string }>()
const emit = defineEmits<{ recordingActive: [boolean] }>()

const verificationStore = useVerificationStore()

const MIN_DURATION_SECONDS = 10
const previewEl = ref<HTMLVideoElement | null>(null)
const isRecording = ref(false)
const completed = ref(false)
const files = ref<RecordedFileInfo[]>([])
const errorMessage = ref('')

// Coarse total-rotation estimate (Environment spec §5: "rotationCoverageDeg
// 作為大致完成環繞的輔助資料... 不要因沒有 Gyroscope 阻擋 Verification") — a
// rough proxy from summed 3-axis rotation-rate magnitude, not a real
// orientation-tracking algorithm; duration + user completion are the actual
// fallback when this isn't available.
let rotationSum = 0
let lastSampleAtMs = 0
let motionSupported = motionCaptureService.isSupported()

function onMotionSample(sample: MotionSample): void {
  const now = Date.now()
  if (lastSampleAtMs > 0) {
    const dtSeconds = (now - lastSampleAtMs) / 1000
    const rateMagnitude = Math.sqrt(sample.gx ** 2 + sample.gy ** 2 + sample.gz ** 2)
    rotationSum += rateMagnitude * dtSeconds
  }
  lastSampleAtMs = now
}

async function handleRequestStart(): Promise<void> {
  errorMessage.value = ''
  panelRef.value?.begin()
}

const panelRef = ref<InstanceType<typeof EngineMeasurementPanel> | null>(null)

async function handleRecordingStart(): Promise<void> {
  rotationSum = 0
  lastSampleAtMs = 0
  errorMessage.value = ''
  try {
    const stream = await videoRecorderService.start()
    isRecording.value = true
    emit('recordingActive', true)
    // previewEl's <video> is gated by v-if="isRecording" — it doesn't exist
    // in the DOM yet at this exact line (Vue hasn't re-rendered), so binding
    // srcObject here silently no-ops (guarded by the `if`) and the live
    // preview never appears, even though the stream itself has both tracks
    // fine (confirmed live: the recorded file is unaffected, only the
    // on-screen preview was broken). Wait one tick for the element to exist.
    await nextTick()
    if (previewEl.value) previewEl.value.srcObject = stream
    if (motionSupported) {
      try {
        await motionCaptureService.start(onMotionSample)
      } catch {
        motionSupported = false
      }
    }
  } catch (error) {
    videoRecorderService.cancel()
    isRecording.value = false
    emit('recordingActive', false)
    errorMessage.value = error instanceof Error ? error.message : '無法開始錄影，請確認已授權相機與麥克風權限後再試一次'
    panelRef.value?.cancel()
  }
}

async function handleDone(): Promise<void> {
  motionCaptureService.stop()
  isRecording.value = false
  emit('recordingActive', false)
  try {
    const result = await videoRecorderService.stop()
    const remoteUrl = await storageService.uploadEvidenceFile(
      props.verificationId,
      'PREP-03',
      result.blob,
      'webm',
    )
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: 'PREP-03',
      type: 'video',
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
      metadata: {
        durationMs: result.durationMs,
        rotationCoverageDeg: motionSupported ? Math.round(rotationSum) : null,
        captureVersion: 'environment-capture-v1',
      },
    }
    await verificationStore.addEvidence(evidence)
    await verificationStore.saveAnswer('PREP-03', 'normal')
    files.value = [
      {
        kind: 'video',
        label: '環境檢測影片',
        filename: `environment_${Date.now()}.webm`,
        durationSeconds: Math.round(result.durationMs / 1000),
        sizeBytes: result.blob.size,
      },
    ]
    completed.value = true
    // Fire-and-forget — the Trusted Backend populates
    // Verification.environmentContext once frame extraction + Gemini
    // finish; this is context, not a gate (spec §2), so nothing here waits
    // on it.
    analyzeEnvironmentSession(props.verificationId).catch(() => {})
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '儲存影片失敗，請重新測量'
    panelRef.value?.reset()
  }
}

function handleRemeasure(): void {
  completed.value = false
  files.value = []
}

onBeforeUnmount(() => {
  motionCaptureService.stop()
  if (isRecording.value) videoRecorderService.cancel()
})
</script>

<template>
  <div class="environment-session">
    <div class="top-card">
      <div class="top-card-header">
        <div class="icon-chip"><Compass :size="20" /></div>
        <div class="top-card-titles">
          <p class="eyebrow">目前檢測項目</p>
          <h2>驗車環境檢測</h2>
        </div>
      </div>
      <p class="main-copy">請站在車輛旁，保持手機平穩並緩慢轉一圈，拍攝周圍驗車環境。</p>
      <div class="tips-box">
        <ul class="tips">
          <li>完整拍攝周圍環境</li>
          <li>保持手機平穩</li>
          <li>請勿快速旋轉</li>
          <li>此時車輛請保持未發動</li>
        </ul>
      </div>
    </div>

    <div v-if="isRecording" class="preview-card">
      <video ref="previewEl" autoplay muted playsinline class="preview-video" />
    </div>

    <div class="panel-card">
      <EngineMeasurementPanel
        ref="panelRef"
        :min-duration-seconds="MIN_DURATION_SECONDS"
        start-label="開始環境檢測"
        :completed="completed"
        :files="files"
        @request-start="handleRequestStart"
        @recording-start="handleRecordingStart"
        @done="handleDone"
        @remeasure="handleRemeasure"
      />
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.environment-session {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.top-card,
.preview-card,
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

.preview-card {
  padding: 0;
  overflow: hidden;
}

.preview-video {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: #000;
  display: block;
}

.error-text {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger);
}
</style>
