<script setup lang="ts">
/**
 * 行照驗證 (registration certificate check) — gates VehicleDetailView's
 * "開始新的驗證" button. Typing "test" (case-insensitive) into 行照號碼 skips
 * the photo/OCR requirement entirely (a QA/demo bypass); any other value
 * requires a 行照 photo and goes through server-side Gemini OCR. The result
 * (`registrationVerification`) is Trusted-Backend-only — this component only
 * ever triggers the Cloud Function, never writes the field itself.
 */
import { computed, reactive, ref } from 'vue'
import { FileCheck2, ShieldAlert, ShieldCheck, Upload } from 'lucide-vue-next'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { storageService } from '@/services/firebase/storage.service'
import { verifyVehicleRegistrationDocument } from '@/services/firebase/ai-analysis.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { Vehicle } from '@/types/vehicle'

const props = defineProps<{
  vehicleId: string
  verification?: Vehicle['registrationVerification']
}>()

const vehicleStore = useVehicleStore()

const status = computed(() => props.verification?.status ?? 'unverified')

function isTestBypass(input: string): boolean {
  return input.trim().toLowerCase() === 'test'
}

const form = reactive({ registrationNumber: '' })
const file = ref<File | null>(null)
const submitting = ref(false)
const errorMessage = ref('')

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function submit(): Promise<void> {
  errorMessage.value = ''
  const trimmed = form.registrationNumber.trim()
  if (!trimmed) {
    errorMessage.value = '請輸入行照號碼'
    return
  }
  if (!isTestBypass(trimmed) && !file.value) {
    errorMessage.value = '請上傳行照照片'
    return
  }
  submitting.value = true
  try {
    let documentUrl: string | undefined
    if (file.value) {
      const extension = file.value.name.split('.').pop() || 'jpg'
      documentUrl = await storageService.uploadVehicleRegistrationDocument(
        props.vehicleId,
        file.value,
        extension,
      )
    }
    await verifyVehicleRegistrationDocument({
      vehicleId: props.vehicleId,
      registrationNumberInput: trimmed,
      documentUrl,
    })
    await vehicleStore.fetchVehicle(props.vehicleId)
    form.registrationNumber = ''
    file.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '驗證失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="registration-card">
    <div class="card-header">
      <ShieldCheck v-if="status === 'passed'" :size="18" color="var(--color-success)" />
      <ShieldAlert v-else-if="status === 'attention'" :size="18" color="var(--color-danger)" />
      <FileCheck2 v-else :size="18" color="var(--color-text-secondary)" />
      <h3 class="section-title" style="margin: 0">行照驗證</h3>
    </div>

    <template v-if="status === 'passed'">
      <p class="passed-text">✓ 行照驗證已通過，才能開始驗車</p>
      <div class="verified-info">
        <div class="info-row">
          <span>引擎號碼</span>
          <span>{{ verification?.ocrEngineNumber || '—' }}</span>
        </div>
        <div class="info-row">
          <span>車身號碼</span>
          <span>{{ verification?.ocrChassisNumber || '—' }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <p v-if="status === 'attention'" class="attention-text">
        ⚠ 上次驗證未通過{{ verification?.note ? `：${verification.note}` : '' }}，請重新上傳行照。
      </p>
      <p class="hint">
        請輸入行照號碼並上傳行照照片，系統將以 OCR 辨識引擎號碼與車身號碼。通過後才能開始這台車的驗車流程。
      </p>
      <label class="field">
        <span>行照號碼</span>
        <input v-model="form.registrationNumber" placeholder="請輸入行照號碼" />
      </label>
      <label v-if="!isTestBypass(form.registrationNumber)" class="field">
        <span>行照照片</span>
        <input type="file" accept="image/*" @change="handleFileChange" />
      </label>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <PrimaryButton block :disabled="submitting" @click="submit">
        <Upload :size="15" />{{ submitting ? '驗證中...' : '送出驗證' }}
      </PrimaryButton>
    </template>
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

.passed-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-success);
}

.attention-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger);
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

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.field input[type='text'],
.field input:not([type]) {
  height: 42px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text-primary);
}

.error {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-danger);
}
</style>
