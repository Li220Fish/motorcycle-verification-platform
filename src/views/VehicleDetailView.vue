<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Bike, MoreHorizontal, Pencil } from 'lucide-vue-next'
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

// Real end users must never see the internal Storage/camera test harness —
// only bundled into dev builds (P2 §09 of the UX report).
const isDev = import.meta.env.DEV

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
    type: verification.type,
    label: typeLabel[verification.type] ?? verification.type,
    date: formatDate(verification.createdAt),
    completed: verification.status === 'completed',
  })),
)

function openVerification(item: (typeof verificationItems.value)[number]): void {
  if (!item.completed) {
    router.push(`/verification/${item.id}`)
    return
  }
  router.push(
    item.type === 'buyer'
      ? `/verification/${item.id}/comparison`
      : `/verification/${item.id}/report`,
  )
}

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

// Powers the Home "我的車輛" status card's 總里程/平均油耗/保養提醒 stats —
// user-entered here since there's no odometer/service-schedule integration.
const editingStats = ref(false)
const statsForm = reactive({ mileage: '', avgFuelConsumption: '', maintenanceReminderCount: '' })
const savingStats = ref(false)

function hydrateStatsForm(): void {
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return
  statsForm.mileage = vehicle.mileage?.toString() ?? ''
  statsForm.avgFuelConsumption = vehicle.avgFuelConsumption?.toString() ?? ''
  statsForm.maintenanceReminderCount = vehicle.maintenanceReminderCount?.toString() ?? ''
}

watch(() => vehicleStore.currentVehicle, hydrateStatsForm, { immediate: true })

function openStatsEditor(): void {
  hydrateStatsForm()
  editingStats.value = true
}

async function saveStats(): Promise<void> {
  savingStats.value = true
  try {
    await vehicleStore.updateVehicle(props.id, {
      mileage: statsForm.mileage === '' ? null : Number(statsForm.mileage),
      avgFuelConsumption:
        statsForm.avgFuelConsumption === '' ? null : Number(statsForm.avgFuelConsumption),
      maintenanceReminderCount:
        statsForm.maintenanceReminderCount === ''
          ? null
          : Number(statsForm.maintenanceReminderCount),
    })
    editingStats.value = false
  } finally {
    savingStats.value = false
  }
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
        <img
          v-if="vehicleStore.currentVehicle.imageUrl"
          :src="vehicleStore.currentVehicle.imageUrl"
          class="hero-img"
          alt=""
        />
        <Bike v-else :size="72" color="var(--color-text-disabled)" />
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
          <span>引擎號碼</span>
          <span>{{ vehicleStore.currentVehicle.engineNumber || '—' }}</span>
        </div>
        <div class="info-row">
          <span>車身號碼</span>
          <span>{{ vehicleStore.currentVehicle.chassisNumber || '—' }}</span>
        </div>
        <div class="info-row">
          <span>建立日期</span>
          <span>{{ formatDate(vehicleStore.currentVehicle.createdAt) }}</span>
        </div>
      </div>

      <div class="info-card stats-card">
        <div class="stats-card-header">
          <h3 class="section-title" style="margin: 0">車輛狀態數據</h3>
          <button v-if="!editingStats" class="edit-btn" @click="openStatsEditor">
            <Pencil :size="13" /> 編輯
          </button>
        </div>
        <template v-if="!editingStats">
          <div class="stats-row">
            <div class="stat">
              <span class="stat-value">{{
                vehicleStore.currentVehicle.maintenanceReminderCount ?? '—'
              }}</span>
              <span class="stat-label">保養提醒</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{
                vehicleStore.currentVehicle.mileage?.toLocaleString() ?? '—'
              }}</span>
              <span class="stat-label">總里程 km</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{
                vehicleStore.currentVehicle.avgFuelConsumption ?? '—'
              }}</span>
              <span class="stat-label">平均油耗</span>
            </div>
          </div>
        </template>
        <form v-else class="stats-form" @submit.prevent="saveStats">
          <label>
            <span>保養提醒（件）</span>
            <input v-model="statsForm.maintenanceReminderCount" type="number" min="0" />
          </label>
          <label>
            <span>總里程（km）</span>
            <input v-model="statsForm.mileage" type="number" min="0" />
          </label>
          <label>
            <span>平均油耗（km/L）</span>
            <input v-model="statsForm.avgFuelConsumption" type="number" min="0" step="0.1" />
          </label>
          <div class="stats-form-actions">
            <button type="button" class="secondary-btn" @click="editingStats = false">取消</button>
            <PrimaryButton type="submit" :disabled="savingStats">
              {{ savingStats ? '儲存中...' : '儲存' }}
            </PrimaryButton>
          </div>
        </form>
      </div>

      <h3 class="section-title">驗證紀錄</h3>
      <div v-if="verificationItems.length === 0" class="empty-hint">尚無驗證紀錄。</div>
      <div v-else class="verification-list">
        <button
          v-for="item in verificationItems"
          :key="item.id"
          class="verification-row"
          @click="openVerification(item)"
        >
          <span>{{ item.label }}</span>
          <span class="verification-date">{{ item.date }}</span>
          <StatusBadge :tone="item.completed ? 'success' : 'primary'">
            {{ item.completed ? '✓ 已完成' : '進行中' }}
          </StatusBadge>
        </button>
      </div>

      <PrimaryButton block @click="startVerification">開始新的驗證</PrimaryButton>

      <details v-if="isDev" class="dev-tools">
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
  overflow: hidden;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.stats-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) 0;
}

.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12.5px;
  font-weight: 700;
  padding: 4px;
}

.stats-row {
  display: flex;
  padding-bottom: var(--space-sm);
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.stat-value {
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.stats-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-bottom: var(--space-sm);
}

.stats-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.stats-form input {
  height: 42px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text-primary);
}

.stats-form-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: 4px;
}

.stats-form-actions .secondary-btn {
  flex: 0 0 auto;
  height: 42px;
  padding: 0 var(--space-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-weight: 600;
}

.stats-form-actions :deep(.btn) {
  flex: 1;
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
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  color: inherit;
  text-align: left;
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
