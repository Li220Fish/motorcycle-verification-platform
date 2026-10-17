<script setup lang="ts">
/**
 * Focused evidence-photo capture for one 基本12項健檢 item marked 異常
 * (BasicHealthCheck13.vue) — a boxed 3:4 guided viewfinder with an object-
 * frame guide (GuideOverlay.vue) and a level line, both ported from
 * projectTest/ride/capture-app (the 採集 App's training-photo camera,
 * already proven on real devices). Reuses training-shots.ts's guide
 * geometry directly since it's keyed by the SAME part keys as the 12-item
 * checklist (basic-health-check-items.ts) — no separate guide data needed
 * just for this.
 *
 * Kept boxed at a real 3:4 aspect (not full-bleed like CorePhotoCaptureFlow)
 * specifically so GuideOverlay's 300×400 SVG maps onto the video 1:1 with no
 * stretch — a full-screen viewfinder on a taller phone would distort the
 * guide circles into ellipses.
 *
 * Deliberately skippable (打叉 still saves the 異常 result either way — see
 * BasicHealthCheck13.vue's handleFailPick) — this is supplementary evidence,
 * not a new required gate on top of the existing fast tap-to-mark flow.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Flashlight, X } from 'lucide-vue-next'

import { useI18n } from '@/composables/useI18n'
import { effectiveRoll, startTilt, stopTilt, tilt } from '@/services/media/device-tilt.service'
import { liveCameraService } from '@/services/media/live-camera.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { storageService } from '@/services/firebase/storage.service'
import { useVerificationStore } from '@/stores/verification.store'
import { basicHealthCheckItemId } from '@/data/verification/basic-health-check-items'
import { shotGuides, TRAINING_SHOTS } from '@/data/training/training-shots'
import type { VehicleType } from '@/data/training/training-dataset.types'
import type { VerificationEvidence } from '@/types/verification-evidence'
import GuideOverlay from './GuideOverlay.vue'

const props = defineProps<{
  verificationId: string
  itemKey: string
  itemLabel: string
  vehicleType: VehicleType
}>()
const emit = defineEmits<{ captured: []; skip: [] }>()

const { t } = useI18n()
const verificationStore = useVerificationStore()

/** Several training shots can share one part key (e.g. frontbrake has
 *  disc-left/disc-right/drum variants) — any one of them is a reasonable
 *  framing aid here, this is a visual nudge for an evidence photo, not the
 *  pixel-precise annotation target training capture needs. */
const shot = computed(() => TRAINING_SHOTS.find((s) => s.partKey === props.itemKey) ?? null)
const guides = computed(() => (shot.value ? shotGuides(shot.value, props.vehicleType) : []))

type Phase = 'requesting' | 'live' | 'denied'
const phase = ref<Phase>('requesting')
const errorMessage = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
const torchSupported = ref(false)
const torchOn = ref(false)
const flashing = ref(false)
const uploading = ref(false)
const uploadErrorMessage = ref('')

const roll = computed(() => (tilt.rollDeg === null ? null : effectiveRoll()))
const isLevel = computed(() => roll.value !== null && Math.abs(roll.value) <= 2)

async function setTorch(on: boolean): Promise<void> {
  if (!torchSupported.value) return
  try {
    await liveCameraService.setTorch(on)
    torchOn.value = on
  } catch (error) {
    console.error('[HealthCheckIssuePhotoCapture] torch toggle failed:', error)
  }
}

function toggleTorch(): void {
  void setTorch(!torchOn.value)
}

async function startCamera(): Promise<void> {
  phase.value = 'requesting'
  errorMessage.value = ''
  try {
    const stream = await liveCameraService.start('environment')
    phase.value = 'live'
    await nextTick()
    if (videoEl.value) videoEl.value.srcObject = stream
    torchOn.value = false
    torchSupported.value = await liveCameraService.isTorchSupported()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : ''
    phase.value = 'denied'
  }
}

function flashShutter(): void {
  flashing.value = true
  setTimeout(() => {
    flashing.value = false
  }, 150)
}

let busy = false
async function shutter(): Promise<void> {
  const video = videoEl.value
  if (!video || phase.value !== 'live' || busy || uploading.value) return
  busy = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })
    if (!blob) return
    flashShutter()

    uploading.value = true
    uploadErrorMessage.value = ''
    const compressed = await imageCompressionService.compressImage(blob)
    const itemId = basicHealthCheckItemId(props.itemKey)
    const remoteUrl = await storageService.uploadEvidenceFile(
      props.verificationId,
      itemId,
      compressed.blob,
      'jpg',
    )
    const evidence: VerificationEvidence = {
      id: crypto.randomUUID(),
      verificationId: props.verificationId,
      itemId,
      type: 'photo',
      localUri: URL.createObjectURL(blob),
      remoteUrl,
      createdAt: Date.now(),
      captureSource: 'camera',
      captureTimestamp: Date.now(),
      metadata: {
        rollDeg: roll.value === null ? null : Math.round(roll.value * 10) / 10,
      },
    }
    await verificationStore.addEvidence(evidence)
    emit('captured')
  } catch (error) {
    uploadErrorMessage.value =
      error instanceof Error ? error.message : t('healthCheckIssuePhoto', 'uploadFailed')
  } finally {
    uploading.value = false
    busy = false
  }
}

onMounted(() => {
  void startCamera()
  void startTilt()
})
onBeforeUnmount(() => {
  liveCameraService.stop()
  stopTilt()
})
</script>

<template>
  <Teleport to="body">
    <div class="issue-capture">
      <div class="top-bar">
        <div class="top-titles">
          <p class="top-eyebrow">{{ t('healthCheckIssuePhoto', 'eyebrow') }}</p>
          <p class="top-title">{{ itemLabel }}</p>
        </div>
        <button class="skip-btn" @click="emit('skip')">
          {{ t('healthCheckIssuePhoto', 'skip') }}
        </button>
      </div>

      <div class="viewfinder-wrap">
        <div class="viewfinder">
          <video
            v-if="phase === 'live'"
            ref="videoEl"
            class="feed"
            autoplay
            muted
            playsinline
          />
          <div v-else class="placeholder">
            <p v-if="phase === 'requesting'" class="placeholder-text">
              {{ t('corePhotoCapture', 'preparingCamera') }}
            </p>
            <template v-else>
              <p class="placeholder-text">{{ t('corePhotoCapture', 'needCameraPermission') }}</p>
              <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
              <button class="retry-btn" @click="startCamera">
                {{ t('corePhotoCapture', 'retry') }}
              </button>
            </template>
          </div>

          <GuideOverlay v-if="phase === 'live' && guides.length > 0" :guides="guides" tone="warn" />

          <div
            v-if="phase === 'live' && roll !== null"
            class="level-line"
            :class="{ ok: isLevel }"
            :style="{ transform: `translate(-50%, -50%) rotate(${-roll}deg)` }"
          />

          <Transition name="flash-fade">
            <div v-if="flashing" class="shutter-flash" />
          </Transition>
        </div>
      </div>

      <p v-if="uploadErrorMessage" class="upload-error-banner">{{ uploadErrorMessage }}</p>
      <p v-else class="instruction">{{ t('healthCheckIssuePhoto', 'instruction') }}</p>

      <div class="bottom-bar">
        <button
          class="torch-btn"
          :class="{ on: torchOn }"
          :disabled="!torchSupported"
          :aria-label="t('corePhotoCapture', 'torchAriaLabel')"
          @click="toggleTorch"
        >
          <Flashlight :size="20" />
        </button>
        <button
          class="shutter-btn"
          :disabled="phase !== 'live' || uploading"
          :aria-label="t('corePhotoCapture', 'photoAriaLabel')"
          @click="shutter"
        >
          <span class="shutter-inner" />
        </button>
        <button
          class="close-btn"
          :aria-label="t('common', 'close')"
          @click="emit('skip')"
        >
          <X :size="20" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.issue-capture {
  position: fixed;
  inset: 0;
  z-index: 420;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)))
    var(--space-md) var(--space-sm);
}

.top-titles {
  min-width: 0;
}

.top-eyebrow {
  margin: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}

.top-title {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 800;
}

.skip-btn {
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--radius-md);
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.viewfinder-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 0 var(--space-md);
}

.viewfinder {
  position: relative;
  aspect-ratio: 3 / 4;
  width: 100%;
  max-width: min(100%, 70dvh);
  max-height: 100%;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: #111;
}

.feed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  text-align: center;
}

.placeholder-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.error-text {
  margin: 0;
  color: #f87171;
  font-size: 12px;
}

.retry-btn {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.level-line {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 5;
  width: 46%;
  height: 2px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.level-line.ok {
  background: var(--color-success, #22c55e);
}

.shutter-flash {
  position: absolute;
  inset: 0;
  background: #fff;
  pointer-events: none;
}

.flash-fade-enter-active,
.flash-fade-leave-active {
  transition: opacity 0.15s ease;
}

.flash-fade-enter-from,
.flash-fade-leave-to {
  opacity: 0;
}

.upload-error-banner {
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  text-align: center;
  color: #f87171;
  font-size: 12.5px;
  font-weight: 600;
}

.instruction {
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  text-align: center;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.75);
}

.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  padding: var(--space-sm) var(--space-md)
    calc(var(--space-lg) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
}

.torch-btn,
.close-btn {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.torch-btn.on {
  background: #fff;
  color: #b45309;
}

.torch-btn:disabled {
  opacity: 0.35;
}

.shutter-btn {
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shutter-btn:disabled {
  opacity: 0.5;
}

.shutter-inner {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #fff;
}
</style>
