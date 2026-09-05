<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PhotoCapture from '@/components/media/PhotoCapture.vue'
import VideoCapture from '@/components/media/VideoCapture.vue'
import AudioRecorder from '@/components/media/AudioRecorder.vue'
import VehiclePhotoGallery from '@/components/vehicle/VehiclePhotoGallery.vue'
import VehicleRegistrationCard from '@/components/vehicle/VehicleRegistrationCard.vue'
import { storageService } from '@/services/firebase/storage.service'
import { vehicleLogService } from '@/services/firebase/vehicle-log.service'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import { computeAverageFuelConsumption } from '@/utils/fuel-average'
import type { FuelLog, MaintenanceLog } from '@/types/vehicle-log'

const props = defineProps<{ id: string }>()

// Real end users must never see the internal Storage/camera test harness —
// only bundled into dev builds (P2 §09 of the UX report).
const isDev = import.meta.env.DEV

const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()
const authStore = useAuthStore()
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
  seller: '車輛驗證',
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
    uploadedUrl.value = await storageService.uploadFileAtPath(
      `dev-test/${Date.now()}-${file.name}`,
      file,
    )
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

const isRegistrationVerified = computed(
  () => vehicleStore.currentVehicle?.registrationVerification?.status === 'passed',
)

function startVerification(): void {
  if (!isRegistrationVerified.value) return
  router.push({ path: '/verification', query: { vehicleId: props.id } })
}

// Powers the Home "我的車輛" status card's 總里程/平均油耗 stats. 總里程 is
// still user-entered (no odometer integration) — 平均油耗 is derived from
// 加油紀錄 instead (see derivedAvgFuelConsumption below) and is display-only.
const editingStats = ref(false)
const statsForm = reactive({ mileage: '' })
const savingStats = ref(false)

function hydrateStatsForm(): void {
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return
  statsForm.mileage = vehicle.mileage?.toString() ?? ''
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
    })
    editingStats.value = false
  } finally {
    savingStats.value = false
  }
}

// Vehicle identity fields (車牌/引擎號碼/車身號碼) — same edit-toggle pattern
// as the stats card above, reusing its .stats-form styling.
const editingInfo = ref(false)
const infoForm = reactive({ licensePlate: '', engineNumber: '', chassisNumber: '' })
const savingInfo = ref(false)

function hydrateInfoForm(): void {
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return
  infoForm.licensePlate = vehicle.licensePlate ?? ''
  infoForm.engineNumber = vehicle.engineNumber ?? ''
  infoForm.chassisNumber = vehicle.chassisNumber ?? ''
}

watch(() => vehicleStore.currentVehicle, hydrateInfoForm, { immediate: true })

function openInfoEditor(): void {
  hydrateInfoForm()
  editingInfo.value = true
}

async function saveInfo(): Promise<void> {
  savingInfo.value = true
  try {
    await vehicleStore.updateVehicle(props.id, {
      licensePlate: infoForm.licensePlate.trim(),
      engineNumber: infoForm.engineNumber.trim() || null,
      chassisNumber: infoForm.chassisNumber.trim() || null,
    })
    editingInfo.value = false
  } finally {
    savingInfo.value = false
  }
}

// Fuel-up / maintenance logs — vehicles/{id}/fuelLogs & /maintenanceLogs.
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function millisToDateStr(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10)
}

const fuelLogs = ref<FuelLog[]>([])
const showFuelForm = ref(false)
const fuelForm = reactive({ date: '', mileage: '', liters: '', cost: '', note: '', fullTank: true })
const savingFuel = ref(false)

const maintenanceLogs = ref<MaintenanceLog[]>([])
const showMaintenanceForm = ref(false)
const maintenanceForm = reactive({ date: '', mileage: '', item: '', cost: '', note: '' })
const savingMaintenance = ref(false)

async function loadLogs(): Promise<void> {
  const [fuel, maintenance] = await Promise.all([
    vehicleLogService.listFuelLogs(props.id),
    vehicleLogService.listMaintenanceLogs(props.id),
  ])
  fuelLogs.value = fuel
  maintenanceLogs.value = maintenance
}

// Full-to-full average (spec §8) — see src/utils/fuel-average.ts. Display-only;
// nothing persists this back onto the vehicle doc (see HomeContent.vue for
// how the Home status card gets its own copy of this same calculation).
const derivedAvgFuelConsumption = computed<number | null>(() =>
  computeAverageFuelConsumption(fuelLogs.value),
)

const editingFuelLogId = ref<string | null>(null)

function openFuelForm(): void {
  editingFuelLogId.value = null
  fuelForm.date = todayStr()
  fuelForm.mileage = ''
  fuelForm.liters = ''
  fuelForm.cost = ''
  fuelForm.note = ''
  fuelForm.fullTank = true
  showFuelForm.value = true
}

function openEditFuelLog(log: FuelLog): void {
  editingFuelLogId.value = log.id
  fuelForm.date = millisToDateStr(log.refueledAt)
  fuelForm.mileage = log.mileage === null ? '' : String(log.mileage)
  fuelForm.liters = log.liters === null ? '' : String(log.liters)
  fuelForm.cost = String(log.costTwd)
  fuelForm.note = log.note ?? ''
  fuelForm.fullTank = log.fullTank
  showFuelForm.value = true
}

function closeFuelForm(): void {
  showFuelForm.value = false
  editingFuelLogId.value = null
}

async function saveFuelLog(): Promise<void> {
  if (!fuelForm.date || fuelForm.cost === '' || !authStore.user) return
  savingFuel.value = true
  try {
    const payload = {
      refueledAt: new Date(fuelForm.date).getTime(),
      mileage: fuelForm.mileage === '' ? null : Number(fuelForm.mileage),
      liters: fuelForm.liters === '' ? null : Number(fuelForm.liters),
      costTwd: Number(fuelForm.cost),
      fullTank: fuelForm.fullTank,
      note: fuelForm.note.trim() || null,
    }
    if (editingFuelLogId.value) {
      await vehicleLogService.updateFuelLog(props.id, editingFuelLogId.value, payload)
    } else {
      await vehicleLogService.createFuelLog({
        vehicleId: props.id,
        recordedBy: authStore.user.id,
        ...payload,
      })
    }
    closeFuelForm()
    await loadLogs()
  } finally {
    savingFuel.value = false
  }
}

async function removeFuelLog(log: FuelLog): Promise<void> {
  if (!window.confirm('刪除這筆加油紀錄？此操作無法復原。')) return
  await vehicleLogService.deleteFuelLog(props.id, log.id)
  fuelLogs.value = fuelLogs.value.filter((item) => item.id !== log.id)
  if (editingFuelLogId.value === log.id) closeFuelForm()
}

function openMaintenanceForm(): void {
  maintenanceForm.date = todayStr()
  maintenanceForm.mileage = ''
  maintenanceForm.item = ''
  maintenanceForm.cost = ''
  maintenanceForm.note = ''
  showMaintenanceForm.value = true
}

async function saveMaintenanceLog(): Promise<void> {
  if (!maintenanceForm.date || !maintenanceForm.item.trim() || !authStore.user) return
  savingMaintenance.value = true
  try {
    const costTwd = maintenanceForm.cost === '' ? null : Number(maintenanceForm.cost)
    await vehicleLogService.createMaintenanceLog({
      vehicleId: props.id,
      servicedAt: new Date(maintenanceForm.date).getTime(),
      mileage: maintenanceForm.mileage === '' ? null : Number(maintenanceForm.mileage),
      items: [{ type: 'other', name: maintenanceForm.item.trim(), costTwd: costTwd ?? 0 }],
      shopName: null,
      totalCostTwd: costTwd,
      note: maintenanceForm.note.trim() || null,
      receiptUrls: [],
      recordedBy: authStore.user.id,
    })
    showMaintenanceForm.value = false
    await loadLogs()
  } finally {
    savingMaintenance.value = false
  }
}

async function removeMaintenanceLog(log: MaintenanceLog): Promise<void> {
  if (!window.confirm('刪除這筆保養紀錄？此操作無法復原。')) return
  await vehicleLogService.deleteMaintenanceLog(props.id, log.id)
  maintenanceLogs.value = maintenanceLogs.value.filter((item) => item.id !== log.id)
}

// Top-right "..." menu — 新增車輛 jumps to 我的車輛 with its form pre-opened,
// 刪除車輛 only removes the vehicle doc itself (verification history for it
// is left intact, same as the Freeze Zone posture elsewhere in this app).
const menuOpen = ref(false)
const deletingVehicle = ref(false)

function goToAddVehicle(): void {
  menuOpen.value = false
  router.push({ path: '/vehicles', query: { new: '1' } })
}

async function handleDeleteVehicle(): Promise<void> {
  menuOpen.value = false
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return
  const label = `${vehicle.brand} ${vehicle.model}`.trim() || '這台車'
  if (!window.confirm(`刪除「${label}」？此操作無法復原。`)) return
  deletingVehicle.value = true
  try {
    await vehicleStore.deleteVehicle(props.id)
    router.replace('/vehicles')
  } finally {
    deletingVehicle.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    vehicleStore.fetchVehicle(props.id),
    verificationStore.fetchByVehicle(props.id),
    loadLogs(),
  ])
})
</script>

<template>
  <div>
    <AppHeader title="車輛詳情" back>
      <template #right>
        <button class="icon-button" aria-label="更多" @click="menuOpen = !menuOpen">
          <MoreHorizontal :size="20" />
        </button>
      </template>
    </AppHeader>

    <div v-if="menuOpen" class="menu">
      <button @click="goToAddVehicle"><Plus :size="15" />新增車輛</button>
      <button class="danger" :disabled="deletingVehicle" @click="handleDeleteVehicle">
        <Trash2 :size="15" />刪除車輛
      </button>
    </div>

    <p v-if="vehicleStore.loading" class="state-text">載入中...</p>
    <p v-else-if="!vehicleStore.currentVehicle" class="state-text">找不到這台車輛。</p>
    <div v-else class="content">
      <VehiclePhotoGallery
        :vehicle-id="props.id"
        :photos="vehicleStore.currentVehicle.photos"
      />

      <div class="title-block">
        <h2>{{ vehicleStore.currentVehicle.brand }} {{ vehicleStore.currentVehicle.model }}</h2>
        <p class="subtitle">
          <span v-if="vehicleStore.currentVehicle.manufactureYear"
            >{{ vehicleStore.currentVehicle.manufactureYear }} 年式</span
          >
          <span v-if="vehicleStore.currentVehicle.mileage !== null">
            {{ vehicleStore.currentVehicle.manufactureYear ? ' / ' : '' }}
            {{ vehicleStore.currentVehicle.mileage?.toLocaleString() }} km
          </span>
        </p>
      </div>

      <div class="info-card">
        <div class="stats-card-header">
          <h3 class="section-title" style="margin: 0">車輛資料</h3>
          <button v-if="!editingInfo" class="edit-btn" @click="openInfoEditor">
            <Pencil :size="13" /> 編輯
          </button>
        </div>
        <template v-if="!editingInfo">
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
        </template>
        <form v-else class="stats-form" @submit.prevent="saveInfo">
          <label>
            <span>車牌號碼</span>
            <input v-model="infoForm.licensePlate" placeholder="例如 ABC-1234" />
          </label>
          <label>
            <span>引擎號碼</span>
            <input v-model="infoForm.engineNumber" />
          </label>
          <label>
            <span>車身號碼</span>
            <input v-model="infoForm.chassisNumber" />
          </label>
          <div class="stats-form-actions">
            <button type="button" class="secondary-btn" @click="editingInfo = false">取消</button>
            <PrimaryButton type="submit" :disabled="savingInfo">
              {{ savingInfo ? '儲存中...' : '儲存' }}
            </PrimaryButton>
          </div>
        </form>
      </div>

      <VehicleRegistrationCard
        :vehicle-id="props.id"
        :verification="vehicleStore.currentVehicle.registrationVerification"
      />

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
                vehicleStore.currentVehicle.mileage?.toLocaleString() ?? '—'
              }}</span>
              <span class="stat-label">總里程 km</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ derivedAvgFuelConsumption ?? '—' }}</span>
              <span class="stat-label">平均油耗 km/L</span>
            </div>
          </div>
          <p v-if="derivedAvgFuelConsumption === null" class="stat-hint">
            新增 2 筆以上加滿油箱的加油紀錄，即可自動算出平均油耗。
          </p>
        </template>
        <form v-else class="stats-form" @submit.prevent="saveStats">
          <label>
            <span>總里程（km）</span>
            <input v-model="statsForm.mileage" type="number" min="0" />
          </label>
          <div class="stats-form-actions">
            <button type="button" class="secondary-btn" @click="editingStats = false">取消</button>
            <PrimaryButton type="submit" :disabled="savingStats">
              {{ savingStats ? '儲存中...' : '儲存' }}
            </PrimaryButton>
          </div>
        </form>
      </div>

      <div class="stats-card-header">
        <h3 class="section-title" style="margin: 0">加油紀錄</h3>
        <button class="edit-btn" @click="showFuelForm ? closeFuelForm() : openFuelForm()">
          <Plus :size="13" /> 新增
        </button>
      </div>
      <form v-if="showFuelForm" class="stats-form" @submit.prevent="saveFuelLog">
        <label>
          <span>日期</span>
          <input v-model="fuelForm.date" type="date" required />
        </label>
        <label>
          <span>里程（km）</span>
          <input v-model="fuelForm.mileage" type="number" min="0" />
        </label>
        <label>
          <span>公升數（L）</span>
          <input v-model="fuelForm.liters" type="number" min="0" step="0.1" />
        </label>
        <label>
          <span>金額（元）</span>
          <input v-model="fuelForm.cost" type="number" min="0" required />
        </label>
        <label class="checkbox-label">
          <input v-model="fuelForm.fullTank" type="checkbox" />
          <span>這次有加滿油箱</span>
        </label>
        <label>
          <span>備註</span>
          <input v-model="fuelForm.note" placeholder="選填" />
        </label>
        <div class="stats-form-actions">
          <button type="button" class="secondary-btn" @click="closeFuelForm">取消</button>
          <PrimaryButton type="submit" :disabled="savingFuel">
            {{ savingFuel ? '儲存中...' : editingFuelLogId ? '更新' : '儲存' }}
          </PrimaryButton>
        </div>
      </form>
      <div v-if="fuelLogs.length === 0 && !showFuelForm" class="empty-hint">尚無加油紀錄。</div>
      <div v-else class="log-list">
        <div v-for="log in fuelLogs" :key="log.id" class="log-row">
          <div class="log-main">
            <span class="log-date"
              >{{ formatDate(log.refueledAt)
              }}<template v-if="!log.fullTank">（未加滿）</template></span
            >
            <span class="log-detail">
              <template v-if="log.mileage !== null"
                >{{ log.mileage.toLocaleString() }} km ·
              </template>
              <template v-if="log.liters !== null">{{ log.liters }} L · </template>
              ${{ log.costTwd.toLocaleString() }}
            </span>
            <span v-if="log.note" class="log-note">{{ log.note }}</span>
          </div>
          <div class="log-actions">
            <button class="log-edit" aria-label="編輯加油紀錄" @click="openEditFuelLog(log)">
              <Pencil :size="15" />
            </button>
            <button class="log-delete" aria-label="刪除加油紀錄" @click="removeFuelLog(log)">
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </div>

      <div class="stats-card-header">
        <h3 class="section-title" style="margin: 0">保養紀錄</h3>
        <button
          class="edit-btn"
          @click="showMaintenanceForm ? (showMaintenanceForm = false) : openMaintenanceForm()"
        >
          <Plus :size="13" /> 新增
        </button>
      </div>
      <form v-if="showMaintenanceForm" class="stats-form" @submit.prevent="saveMaintenanceLog">
        <label>
          <span>日期</span>
          <input v-model="maintenanceForm.date" type="date" required />
        </label>
        <label>
          <span>里程（km）</span>
          <input v-model="maintenanceForm.mileage" type="number" min="0" />
        </label>
        <label>
          <span>保養項目</span>
          <input v-model="maintenanceForm.item" placeholder="例如：更換機油" required />
        </label>
        <label>
          <span>金額（元）</span>
          <input v-model="maintenanceForm.cost" type="number" min="0" />
        </label>
        <label>
          <span>備註</span>
          <input v-model="maintenanceForm.note" placeholder="選填" />
        </label>
        <div class="stats-form-actions">
          <button type="button" class="secondary-btn" @click="showMaintenanceForm = false">
            取消
          </button>
          <PrimaryButton type="submit" :disabled="savingMaintenance">
            {{ savingMaintenance ? '儲存中...' : '儲存' }}
          </PrimaryButton>
        </div>
      </form>
      <div v-if="maintenanceLogs.length === 0 && !showMaintenanceForm" class="empty-hint">
        尚無保養紀錄。
      </div>
      <div v-else class="log-list">
        <div v-for="log in maintenanceLogs" :key="log.id" class="log-row">
          <div class="log-main">
            <span class="log-date">{{ formatDate(log.servicedAt) }}</span>
            <span class="log-detail">
              {{ log.items[0]?.name }}
              <template v-if="log.mileage !== null">
                · {{ log.mileage.toLocaleString() }} km</template
              >
              <template v-if="log.totalCostTwd !== null">
                · ${{ log.totalCostTwd.toLocaleString() }}</template
              >
            </span>
            <span v-if="log.note" class="log-note">{{ log.note }}</span>
          </div>
          <button class="log-delete" aria-label="刪除保養紀錄" @click="removeMaintenanceLog(log)">
            <Trash2 :size="15" />
          </button>
        </div>
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

      <PrimaryButton block :disabled="!isRegistrationVerified" @click="startVerification">
        開始新的驗證
      </PrimaryButton>
      <p v-if="!isRegistrationVerified" class="gate-hint">
        請先完成上方「行照驗證」，才能開始這台車的驗車流程。
      </p>

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
        <PhotoCapture />
        <VideoCapture />
        <AudioRecorder />
      </details>
    </div>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  right: var(--space-md);
  top: 52px;
  z-index: 30;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 160px;
}

.menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.menu button.danger {
  color: var(--color-danger);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.log-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.log-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-date {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.log-detail {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.log-note {
  font-size: 11.5px;
  color: var(--color-text-disabled);
}

.log-actions {
  flex-shrink: 0;
  display: flex;
  gap: 2px;
}

.log-edit,
.log-delete {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
}

.log-edit {
  color: var(--color-primary);
}

.log-delete {
  color: var(--color-danger);
}

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

.gate-hint {
  margin: -4px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
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

.stat-hint {
  font-size: 11.5px;
  color: var(--color-text-disabled);
  text-align: center;
  padding-bottom: var(--space-sm);
  margin: 0;
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

.stats-form label.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.stats-form label.checkbox-label input {
  height: auto;
  width: 16px;
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
