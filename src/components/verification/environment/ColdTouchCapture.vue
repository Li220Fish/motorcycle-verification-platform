<script setup lang="ts">
/**
 * Step 39 — 冷車狀態確認 (Cold-state Eligibility Check), Environment/
 * Cold-State spec PART B. Deliberately NOT built on EngineMeasurementPanel:
 * that component is user-controlled (min duration, manual stop); this one
 * is the opposite — the app alone drives an exact 3s pre-roll → 5s contact
 * window → 1s tail → auto-stop schedule with zero user control (spec §20),
 * and those exact millisecond boundaries are written as the Evidence's own
 * timing metadata ("system truth", spec §21) that the backend later
 * validates against, never something the user can shorten or extend.
 */
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { Hand } from 'lucide-vue-next'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import EngineWaveform from '@/components/verification/engine/EngineWaveform.vue'
import { videoRecorderService } from '@/services/media/video-recorder.service'
import { storageService } from '@/services/firebase/storage.service'
import { analyzeColdEngineTouchCheck } from '@/services/firebase/ai-analysis.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{ verificationId: string }>()
const emit = defineEmits<{ recordingActive: [boolean] }>()

const verificationStore = useVerificationStore()

const PRE_ROLL_MS = 3000
const CONTACT_WINDOW_MS = 5000
const TAIL_MS = 1000

type Phase =
  | 'intro'
  | 'checking'
  | 'permission-denied'
  | 'pre-roll'
  | 'contact'
  | 'tail'
  | 'saving'
  | 'done'
  | 'failed'
const phase = ref<Phase>('intro')
const previewEl = ref<HTMLVideoElement | null>(null)
const elapsedMs = ref(0)
const errorMessage = ref('')

let timer: ReturnType<typeof setInterval> | null = null
let recordingStartedAt = 0

function clearTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

async function handleStart(): Promise<void> {
  phase.value = 'checking'
  errorMessage.value = ''
  try {
    const stream = await videoRecorderService.start()
    emit('recordingActive', true)
    // recordingStartedAt/phase/timer are the "system truth" schedule and
    // must not shift by even a tick — set them first, unaffected by the DOM
    // wait below. previewEl's <video> is gated by v-else-if="phase ===
    // 'pre-roll' | ...", so it doesn't exist yet at this exact line (Vue
    // hasn't re-rendered); binding srcObject here silently no-ops (guarded
    // by the `if`) and the live preview never appears, even though the
    // stream itself has both tracks fine. Bind it after nextTick instead —
    // purely cosmetic, doesn't touch the timing above.
    recordingStartedAt = Date.now()
    phase.value = 'pre-roll'
    timer = setInterval(() => {
      elapsedMs.value = Date.now() - recordingStartedAt
      if (elapsedMs.value < PRE_ROLL_MS) {
        phase.value = 'pre-roll'
      } else if (elapsedMs.value < PRE_ROLL_MS + CONTACT_WINDOW_MS) {
        phase.value = 'contact'
      } else if (elapsedMs.value < PRE_ROLL_MS + CONTACT_WINDOW_MS + TAIL_MS) {
        phase.value = 'tail'
      } else {
        clearTimer()
        void finish()
      }
    }, 100)
    await nextTick()
    if (previewEl.value) previewEl.value.srcObject = stream
  } catch (error) {
    videoRecorderService.cancel()
    errorMessage.value = error instanceof Error ? error.message : ''
    phase.value = 'permission-denied'
  }
}

/** Escape hatch for the "checking" (awaiting getUserMedia) phase — normally
 *  resolves in well under a second, but a WebView/camera-hardware hang here
 *  (e.g. the device still thinks the camera is in use by a previous failed
 *  attempt) used to leave the user stuck on this screen with no way out.
 *  video-recorder.service.ts's start()/cancel() now release the camera
 *  properly on every failure path, but this stays as a manual way out of
 *  whatever hang isn't yet accounted for. */
function handleCancelChecking(): void {
  videoRecorderService.cancel()
  phase.value = 'intro'
}

async function finish(): Promise<void> {
  phase.value = 'saving'
  emit('recordingActive', false)
  try {
    const result = await videoRecorderService.stop()
    const remoteUrl = await storageService.uploadEvidenceFile(
      props.verificationId,
      'ENG-02',
      result.blob,
      'webm',
    )
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId: 'ENG-02',
      type: 'video',
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
      metadata: {
        sessionType: 'cold_touch',
        recordingStartedAtMs: 0,
        contactWindowStartMs: PRE_ROLL_MS,
        contactWindowEndMs: PRE_ROLL_MS + CONTACT_WINDOW_MS,
        recordingEndedAtMs: PRE_ROLL_MS + CONTACT_WINDOW_MS + TAIL_MS,
      },
    }
    await verificationStore.addEvidence(evidence)
    await verificationStore.saveAnswer('ENG-02', 'normal')
    phase.value = 'done'
    // Fire-and-forget, same convention as every other capture step — the
    // Trusted Backend overwrites this placeholder with the real verified
    // result (and cold_state validity) once it lands.
    analyzeColdEngineTouchCheck(props.verificationId).catch(() => {})
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : ''
    phase.value = 'failed'
  }
}

function handleRemeasure(): void {
  phase.value = 'intro'
  elapsedMs.value = 0
  errorMessage.value = ''
}

function handleRetry(): void {
  phase.value = 'intro'
  errorMessage.value = ''
}

onBeforeUnmount(() => {
  clearTimer()
  if (phase.value === 'pre-roll' || phase.value === 'contact' || phase.value === 'tail') {
    videoRecorderService.cancel()
  }
})
</script>

<template>
  <div class="cold-touch">
    <div class="top-card">
      <div class="top-card-header">
        <div class="icon-chip"><Hand :size="20" /></div>
        <div class="top-card-titles">
          <p class="eyebrow">目前檢測項目</p>
          <h2>冷車狀態確認</h2>
        </div>
      </div>
      <p class="subhead">請先不要發動車輛</p>
      <p class="main-copy">
        請將鏡頭對準您要觸碰的引擎外部位置。開始後系統會倒數 3 秒，接著請用手指持續觸碰該位置滿 5
        秒，過程全程由系統計時，請勿提前移開。
      </p>
      <div class="tips-box">
        <ul class="tips">
          <li>手機／鏡頭保持穩定</li>
          <li>觸碰位置全程入鏡</li>
          <li>倒數開始後請勿提前移開手指</li>
        </ul>
      </div>
    </div>

    <template v-if="phase === 'intro'">
      <div class="panel-card">
        <PrimaryButton block @click="handleStart">開始冷車檢測</PrimaryButton>
        <p class="min-hint">共約 9 秒，時間由系統自動控制</p>
      </div>
    </template>

    <template v-else-if="phase === 'checking'">
      <div class="panel-card">
        <p class="checking">準備中…</p>
        <button class="remeasure-btn" @click="handleCancelChecking">取消</button>
      </div>
    </template>

    <template v-else-if="phase === 'permission-denied'">
      <div class="panel-card">
        <h2>需要相機與麥克風權限</h2>
        <p class="main-copy">冷車狀態確認需要錄影。請允許 MotoVerify 使用相機與麥克風。</p>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <PrimaryButton block @click="handleStart">允許相機與麥克風</PrimaryButton>
      </div>
    </template>

    <template v-else-if="phase === 'pre-roll' || phase === 'contact' || phase === 'tail'">
      <div class="preview-card">
        <video ref="previewEl" autoplay muted playsinline class="preview-video" />
      </div>
      <div class="panel-card">
        <template v-if="phase === 'pre-roll'">
          <p class="countdown-number">
            {{ Math.max(1, Math.ceil((PRE_ROLL_MS - elapsedMs) / 1000)) }}
          </p>
          <p class="stage-hint">準備開始…</p>
        </template>
        <template v-else-if="phase === 'contact'">
          <div class="recording-header">
            <span class="rec-dot" />
            <span class="rec-label">請開始觸碰並保持不動</span>
          </div>
          <EngineWaveform :active="true" :magnitude="null" />
          <p class="stage-hint">
            剩餘
            {{ Math.max(0, Math.ceil((PRE_ROLL_MS + CONTACT_WINDOW_MS - elapsedMs) / 1000)) }} 秒
          </p>
        </template>
        <template v-else>
          <p class="stage-hint done-mark">✓ 完成，即將結束錄影…</p>
        </template>
      </div>
    </template>

    <template v-else-if="phase === 'saving'">
      <div class="panel-card">
        <p class="checking">正在儲存…</p>
      </div>
    </template>

    <template v-else-if="phase === 'done'">
      <div class="panel-card">
        <p class="done-mark">✓ 冷車檢測已完成，AI 判定中</p>
        <button class="remeasure-btn" @click="handleRemeasure">↻ 重新測量</button>
      </div>
    </template>

    <template v-else-if="phase === 'failed'">
      <div class="panel-card">
        <h2>本次檢測已中斷</h2>
        <p class="main-copy">請重新進行本次檢測。</p>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <PrimaryButton block @click="handleRetry">重新開始</PrimaryButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cold-touch {
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

.min-hint {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.checking {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: var(--space-lg) 0;
}

.countdown-number {
  margin: 0;
  text-align: center;
  font-size: 56px;
  font-weight: 800;
  color: var(--color-primary);
  padding: var(--space-md) 0;
}

.stage-hint {
  margin: 0;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.recording-header {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.rec-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--color-danger);
}

.rec-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-danger);
}

.done-mark {
  color: var(--color-success);
}

.error-text {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger);
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
</style>
