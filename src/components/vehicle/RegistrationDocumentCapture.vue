<script setup lang="ts">
/**
 * Full-screen guided camera capture for 行照 photos — forces every upload
 * into the same framing instead of accepting whatever crop/angle a gallery
 * photo happens to have.
 *
 * Why this exists: the server-side pipeline (registration-document-scanner
 * .service.ts's corner detection + registration-ocr.config.ts's FIELD_ROIS)
 * assumes the document fills the frame edge-to-edge. On real freely-
 * uploaded photos that assumption broke constantly — a quad detected a few
 * percent loose around the paper's actual edge shifted every field's ROI
 * into the wrong row (confirmed empirically in projectTest/registration_ocr
 * .py: one real photo's loose crop put the whole table one row too low,
 * reading 廠牌行式 where 引擎號碼 should have been). No amount of OCR/ROI
 * tuning fixes an upstream framing problem — the fix is to stop letting the
 * framing vary: show the user a fixed-aspect-ratio guide box live over the
 * camera feed and only ever capture what's inside it.
 *
 * Reuses liveCameraService (proven in MultiPhotoEvidenceCapture.vue) for
 * the getUserMedia stream — same full-screen Teleport/shutter visual
 * language as that component, just single-shot with a guide overlay instead
 * of a repeatable filmstrip.
 *
 * 2026-10 v2: the guide draws ONE field box — engineNumber's — on top of the
 * outer frame, not six. An earlier version drew all six FIELD_ROIS boxes at
 * once (plateNumber/engineNumber/chassisNumber/color/displacement/
 * manufactureDate), but that was too fiddly to actually line up in one shot
 * and turned out to be unnecessary: only engineNumber is read for the
 * pass/fail decision (functions/src/services/vehicle-registration.service
 * .ts was scaled back the same way, same day). One bigger, easier-to-hit
 * box both looks simpler and gets a cleaner crop of the field that actually
 * matters. Duplicated from registration-ocr.config.ts's FIELD_ROIS rather
 * than imported — functions/ and the client are separate TypeScript
 * projects with no shared package (same reasoning as that config file's own
 * duplication note); keep both in sync if the calibration ever changes.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { liveCameraService } from '@/services/media/live-camera.service'

const emit = defineEmits<{ captured: [file: File]; cancel: [] }>()

/** width/height — calibrated against real scanned 行照 (see
 *  registration-ocr.config.ts's own FIELD_ROIS comment history):
 *  warped outputs came out ~0.71-0.73, averaged here. The guide doesn't
 *  need to be exact — it just needs the user's document to fill it
 *  edge-to-edge, same as the ROI calibration itself assumes. */
const GUIDE_ASPECT = 0.71

/** Mirrors functions/src/services/registration-ocr.config.ts's FIELD_ROIS
 *  engineNumber entry — drawn as a guide box, not used for any cropping
 *  here (the capture itself just crops to the outer guide rect; the server
 *  still does its own corner-detect + ROI crop on the result).
 *  [x, y, width, height], all 0-1. */
const ENGINE_NUMBER_GUIDE_BOX: [number, number, number, number] = [0.173, 0.425, 0.778, 0.065]

type Phase = 'requesting' | 'live' | 'denied'
const phase = ref<Phase>('requesting')
const errorMessage = ref('')
const videoEl = ref<HTMLVideoElement | null>(null)
const guideEl = ref<HTMLDivElement | null>(null)
const flashing = ref(false)
const capturing = ref(false)

async function startCamera(): Promise<void> {
  phase.value = 'requesting'
  errorMessage.value = ''
  try {
    const stream = await liveCameraService.start()
    phase.value = 'live'
    await nextTick()
    if (videoEl.value) videoEl.value.srcObject = stream
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

/**
 * Crops the captured frame to exactly what the guide box shows on screen —
 * not the full video frame. The video element uses `object-fit: cover`, so
 * its displayed area is a scaled-and-centered crop of the native
 * videoWidth/videoHeight; this replicates that same mapping to find the
 * guide box's position in native pixel coordinates before drawing to the
 * output canvas. Getting this wrong would silently capture the wrong
 * region — reusing MultiPhotoEvidenceCapture.vue's draw-whole-frame
 * approach here would defeat the entire point of a guide box.
 */
function capturePhoto(): void {
  if (phase.value !== 'live' || capturing.value || !videoEl.value || !guideEl.value) return
  const video = videoEl.value
  const videoRect = video.getBoundingClientRect()
  const guideRect = guideEl.value.getBoundingClientRect()
  const nativeW = video.videoWidth
  const nativeH = video.videoHeight
  if (!nativeW || !nativeH || videoRect.width === 0 || videoRect.height === 0) return

  const coverScale = Math.max(videoRect.width / nativeW, videoRect.height / nativeH)
  const displayedW = nativeW * coverScale
  const displayedH = nativeH * coverScale
  const offsetX = (displayedW - videoRect.width) / 2
  const offsetY = (displayedH - videoRect.height) / 2

  const srcX = (guideRect.left - videoRect.left + offsetX) / coverScale
  const srcY = (guideRect.top - videoRect.top + offsetY) / coverScale
  const srcW = guideRect.width / coverScale
  const srcH = guideRect.height / coverScale

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(srcW)
  canvas.height = Math.round(srcH)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  capturing.value = true
  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
  canvas.toBlob(
    (blob) => {
      capturing.value = false
      if (!blob) return
      flashShutter()
      emit('captured', new File([blob], `registration-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    },
    'image/jpeg',
    0.92,
  )
}

function handleCancel(): void {
  liveCameraService.stop()
  emit('cancel')
}

onMounted(startCamera)
onBeforeUnmount(() => liveCameraService.stop())
</script>

<template>
  <Teleport to="body">
    <div class="registration-capture">
      <video v-if="phase === 'live'" ref="videoEl" autoplay muted playsinline class="camera-feed" />
      <div v-else class="camera-placeholder">
        <p v-if="phase === 'requesting'" class="placeholder-text">準備相機中...</p>
        <template v-else>
          <p class="placeholder-text">需要相機權限才能拍攝</p>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
          <button class="retry-btn" @click="startCamera">重試</button>
        </template>
      </div>

      <div v-if="phase === 'live'" ref="guideEl" class="frame-guide">
        <svg class="field-guide-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          <rect
            :x="ENGINE_NUMBER_GUIDE_BOX[0]"
            :y="ENGINE_NUMBER_GUIDE_BOX[1]"
            :width="ENGINE_NUMBER_GUIDE_BOX[2]"
            :height="ENGINE_NUMBER_GUIDE_BOX[3]"
            vector-effect="non-scaling-stroke"
            class="field-guide-box"
          />
        </svg>
      </div>

      <Transition name="flash-fade">
        <div v-if="flashing" class="shutter-flash" />
      </Transition>

      <div class="top-overlay">
        <div class="top-titles">
          <p class="top-title">拍攝行照</p>
          <p class="top-subtitle">請將行照放入框內，讓黃色虛線對齊「引擎號碼」欄位</p>
        </div>
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </div>

      <div v-if="phase === 'live'" class="bottom-overlay">
        <div class="shutter-row">
          <button class="shutter-btn" :disabled="capturing" aria-label="拍照" @click="capturePhoto">
            <span class="shutter-inner" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.registration-capture {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: #000;
  overflow: hidden;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.camera-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.placeholder-text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.error-text {
  color: #f87171;
  font-size: 12px;
  text-align: center;
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

/* box-shadow with a huge spread dims everything outside this box without
   needing a separate overlay element / clip-path. */
.frame-guide {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(84vw, calc(72dvh * v-bind(GUIDE_ASPECT)));
  aspect-ratio: v-bind(GUIDE_ASPECT);
  border: 3px solid #fff;
  border-radius: 14px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.field-guide-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.field-guide-box {
  fill: none;
  stroke: #ffd43b;
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
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

.top-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)))
    var(--space-md) var(--space-lg);
  background: linear-gradient(rgba(0, 0, 0, 0.55), transparent);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  z-index: 2;
}

.top-titles {
  min-width: 0;
}

.top-title {
  margin: 0;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
}

.top-subtitle {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12.5px;
}

.cancel-btn {
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.bottom-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--space-md) var(--space-md)
    calc(var(--space-lg) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  display: flex;
  justify-content: center;
  z-index: 2;
}

.shutter-row {
  display: flex;
  align-items: center;
  justify-content: center;
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
