<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bike, MoreHorizontal } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PhotoCapture from '@/components/media/PhotoCapture.vue'
import VideoCapture from '@/components/media/VideoCapture.vue'
import AudioRecorder from '@/components/media/AudioRecorder.vue'
import { storageService } from '@/services/firebase/storage.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()
const router = useRouter()

const uploading = ref(false)
const uploadedUrl = ref('')
const uploadError = ref('')

function maskLicensePlate(plate: string): string {
  if (plate.length <= 4) return plate
  return `${plate.slice(0, 3)}***${plate.slice(-2)}`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-TW')
}

const typeLabel: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業驗證',
}

const verificationItems = computed(() =>
  verificationStore.verifications.map((verification) => ({
    id: verification.id,
    label: typeLabel[verification.type] ?? verification.type,
    date: formatDate(verification.createdAt),
    completed: verification.status === 'completed',
  })),
)

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  uploadedUrl.value = ''
  try {
    uploadedUrl.value = await storageService.uploadFile('vehicle-images', file, file.name)
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

function startVerification(): void {
  router.push({ path: '/verification', query: { vehicleId: props.id } })
}

onMounted(() => {
  vehicleStore.fetchVehicle(props.id)
  verificationStore.fetchByVehicle(props.id)
})
</script>

<template>
  <div>
    <AppHeader title="車輛詳情" back>
      <template #right>
        <button class="icon-button" aria-label="More">
          <MoreHorizontal :size="20" />
        </button>
      </template>
    </AppHeader>

    <p v-if="vehicleStore.loading" class="state-text">載入中...</p>
    <p v-else-if="!vehicleStore.currentVehicle" class="state-text">找不到這台車輛。</p>
    <div v-else class="content">
      <div class="hero">
        <Bike :size="72" color="var(--color-text-disabled)" />
      </div>

      <div class="title-block">
        <h2>{{ vehicleStore.currentVehicle.brand }} {{ vehicleStore.currentVehicle.model }}</h2>
        <p class="subtitle">
          <span v-if="vehicleStore.currentVehicle.year"
            >{{ vehicleStore.currentVehicle.year }} 年式</span
          >
          <span v-if="vehicleStore.currentVehicle.mileage !== null">
            {{ vehicleStore.currentVehicle.year ? ' / ' : '' }}
            {{ vehicleStore.currentVehicle.mileage?.toLocaleString() }} km
          </span>
        </p>
      </div>

      <div class="info-card">
        <div class="info-row">
          <span>車牌</span>
          <span>{{
            vehicleStore.currentVehicle.licensePlate
              ? maskLicensePlate(vehicleStore.currentVehicle.licensePlate)
              : '—'
          }}</span>
        </div>
        <div class="info-row">
          <span>建立日期</span>
          <span>{{ formatDate(vehicleStore.currentVehicle.createdAt) }}</span>
        </div>
      </div>

      <h3 class="section-title">驗證紀錄</h3>
      <div v-if="verificationItems.length === 0" class="empty-hint">尚無驗證紀錄。</div>
      <div v-else class="verification-list">
        <div v-for="item in verificationItems" :key="item.id" class="verification-row">
          <span>{{ item.label }}</span>
          <span class="verification-date">{{ item.date }}</span>
          <StatusBadge :tone="item.completed ? 'success' : 'primary'">
            {{ item.completed ? '✓ 已完成' : '進行中' }}
          </StatusBadge>
        </div>
      </div>

      <PrimaryButton block @click="startVerification">開始新的驗證</PrimaryButton>

      <details class="dev-tools">
        <summary>開發者測試工具</summary>

        <h4>Storage Test</h4>
        <p class="hint">Upload a test image to Firebase Storage (vehicle-images/).</p>
        <input type="file" accept="image/*" @change="handleFileChange" />
        <p v-if="uploading">Uploading...</p>
        <p v-if="uploadError" class="error">{{ uploadError }}</p>
        <p v-if="uploadedUrl">
          Uploaded:
          <a :href="uploadedUrl" target="_blank" rel="noopener">{{ uploadedUrl }}</a>
        </p>

        <h4>Media Capture Test</h4>
        <p class="hint">Real device hardware — take a photo, record video, and record audio.</p>
        <PhotoCapture folder="verification-images" />
        <VideoCapture />
        <AudioRecorder />
      </details>
    </div>
  </div>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
}

.state-text {
  padding: var(--space-lg) var(--space-md);
  color: var(--color-text-secondary);
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hero {
  height: 200px;
  border-radius: var(--radius-lg);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-block h2 {
  font-size: 22px;
  font-weight: 700;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-top: 2px;
}

.info-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-sm) var(--space-md);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  font-size: 14px;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.info-row span:first-child {
  color: var(--color-text-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.empty-hint {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.verification-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.verification-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.verification-row span:first-child {
  flex: 1;
  font-weight: 600;
}

.verification-date {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.dev-tools {
  margin-top: var(--space-lg);
  border-top: 1px dashed var(--color-border);
  padding-top: var(--space-md);
  color: var(--color-text-secondary);
  font-size: 13px;
}

.dev-tools summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text-primary);
}

.error {
  color: var(--color-danger);
}
</style>
