<script setup lang="ts">
/**
 * 行照驗證 (registration certificate check) — gates VehicleDetailView's
 * "開始新的驗證" button. 2026-10: real pass/fail — the Trusted Backend must
 * actually find a document-shaped photo and read an engine number off it; a
 * `failed` result's `note` (the backend's own explanation) is shown here so
 * the user knows why and can immediately retake/re-upload (the upload form
 * is just the same v-else branch 'failed' already falls into — see
 * vehicle-registration.service.ts for the exact pass rule). The result
 * (`registrationVerification`) is Trusted-Backend-only — this component
 * only ever triggers the Cloud Function, never writes the field itself.
 *
 * 2026-10: an earlier version of this card ran the corner-detect+OCR scan
 * on-device (OpenCV.js + Tesseract.js) to show a live masked preview before
 * upload. Dropped after it proved impractical on a real mid-range Android
 * WebView — opencv.js's ~15MB WASM build either hit a WebView dynamic-
 * import bug or simply took minutes to compile/init on-device. The same
 * corner-detect+OCR pipeline now runs server-side instead
 * (functions/src/services/registration-ocr.service.ts), which is both
 * fast (regular server hardware, not a phone) and keeps the document photo
 * off any third-party vision API.
 *
 * 2026-10: the app no longer displays the registration document photo at
 * all once verification passes — not the raw upload, not the backend's
 * masked (個資 painted over) version either. Only the extracted engine
 * number and pass/fail status show here; the masked photo still exists in
 * Firestore (`registrationDocumentMaskedUrl`) purely for the admin backend's
 * own review screen (VehicleDetailSection.vue).
 *
 * 2026-10: the plain file picker was replaced with a guided in-app camera
 * (RegistrationDocumentCapture.vue) that overlays a fixed-aspect-ratio box
 * the user must align the document to before shooting. Freely-uploaded
 * gallery photos varied too much in framing/angle for the server-side
 * corner detection + FIELD_ROIS pipeline to stay accurate (confirmed on
 * real test photos — a loosely-cropped quad shifted every field's ROI into
 * the wrong row). Forcing consistent framing at capture time fixes the
 * problem at its source instead of chasing it with OCR/preprocessing
 * tuning after the fact.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { FileCheck2, ShieldCheck, Upload } from 'lucide-vue-next'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import RegistrationDocumentCapture from './RegistrationDocumentCapture.vue'
import { useI18n } from '@/composables/useI18n'
import { storageService } from '@/services/firebase/storage.service'
import { verifyVehicleRegistrationDocument } from '@/services/firebase/ai-analysis.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { Vehicle } from '@/types/vehicle'

const props = defineProps<{
  vehicleId: string
  verification?: Vehicle['registrationVerification']
}>()

const vehicleStore = useVehicleStore()
const { t } = useI18n()

const status = computed(() => props.verification?.status ?? 'unverified')

/** 已通過時預設顯示「已通過」畫面；按「重新認證」才切到上傳表單，讓已過的
 *  行照也能重新測試/重傳，不用等後端把 status 改回非 passed。 */
const reverifying = ref(false)
const showUploadForm = computed(() => status.value !== 'passed' || reverifying.value)

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const showCamera = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

function startReverify(): void {
  reverifying.value = true
}

function clearFile(): void {
  file.value = null
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

function cancelReverify(): void {
  reverifying.value = false
  clearFile()
}

function openCamera(): void {
  errorMessage.value = ''
  showCamera.value = true
}

function handleCaptured(captured: File): void {
  showCamera.value = false
  clearFile()
  file.value = captured
  previewUrl.value = URL.createObjectURL(captured)
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

async function submit(): Promise<void> {
  errorMessage.value = ''
  if (!file.value) {
    errorMessage.value = t('registration', 'uploadRequired')
    return
  }
  submitting.value = true
  try {
    const extension = file.value.name.split('.').pop() || 'jpg'
    const documentUrl = await storageService.uploadVehicleRegistrationDocument(
      props.vehicleId,
      file.value,
      extension,
    )
    await verifyVehicleRegistrationDocument({ vehicleId: props.vehicleId, documentUrl })
    await vehicleStore.fetchVehicle(props.vehicleId)
    clearFile()
    reverifying.value = false
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t('registration', 'verifyFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="registration-card">
    <div class="card-header">
      <ShieldCheck v-if="status === 'passed'" :size="18" color="var(--color-success)" />
      <FileCheck2 v-else :size="18" color="var(--color-text-secondary)" />
      <h3 class="section-title" style="margin: 0">{{ t('registration', 'title') }}</h3>
    </div>

    <template v-if="!showUploadForm">
      <p class="passed-text">{{ t('registration', 'passedText') }}</p>
      <div class="verified-info">
        <div class="info-row">
          <span>{{ t('registration', 'engineNumber') }}</span>
          <span>{{ verification?.ocrEngineNumber || '—' }}</span>
        </div>
      </div>
      <button class="secondary" @click="startReverify">{{ t('registration', 'reverify') }}</button>
    </template>

    <template v-else>
      <p v-if="status === 'failed'" class="failed-text">
        {{ t('registration', 'failedText')
        }}{{ verification?.note ? '：' + verification.note : '' }}
      </p>
      <p class="hint">{{ t('registration', 'captureHint') }}</p>

      <img v-if="previewUrl" :src="previewUrl" alt="" class="preview-photo" />
      <button class="secondary" :disabled="submitting" @click="openCamera">
        {{ previewUrl ? t('registration', 'retake') : t('registration', 'openCamera') }}
      </button>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <PrimaryButton block :disabled="submitting || !file" @click="submit">
        <Upload :size="15" />{{
          submitting ? t('registration', 'verifying') : t('registration', 'submit')
        }}
      </PrimaryButton>
      <button
        v-if="status === 'passed'"
        class="secondary"
        :disabled="submitting"
        @click="cancelReverify"
      >
        {{ t('common', 'cancel') }}
      </button>
    </template>

    <RegistrationDocumentCapture
      v-if="showCamera"
      @captured="handleCaptured"
      @cancel="showCamera = false"
    />
  </div>
</template>

<style scoped>
.registration-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-md);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.secondary {
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.passed-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-success);
}

.failed-text {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-danger);
  line-height: 1.5;
}

.hint {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.verified-info {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13.5px;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.info-row span:first-child {
  color: var(--color-text-secondary);
}

.preview-photo {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.error {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-danger);
}
</style>
