<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Bike, ChevronRight, Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { listingService } from '@/services/firebase/listing.service'
import { storageService } from '@/services/firebase/storage.service'
import { verificationService } from '@/services/firebase/verification.service'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { Vehicle } from '@/types/vehicle'

const router = useRouter()
const authStore = useAuthStore()
const vehicleStore = useVehicleStore()

const listings = ref<MockMarketListing[]>([])
const loading = ref(true)
const showForm = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

interface EligibleVehicle {
  vehicle: Vehicle
  verificationId: string
  verificationScore: number
}
const eligibleVehicles = ref<EligibleVehicle[]>([])
const loadingEligible = ref(true)

const form = reactive({
  vehicleId: '',
  priceTwd: null as number | null,
  region: '',
  district: '',
  displacementCc: null as number | null,
  transmission: '',
  color: '',
  transferable: true,
  modified: false,
  description: '',
})
const photoFiles = ref<File[]>([])

async function loadListings(): Promise<void> {
  if (!authStore.user) return
  loading.value = true
  try {
    listings.value = await listingService.listBySeller(authStore.user.id)
  } finally {
    loading.value = false
  }
}

// Only vehicles with a completed 車輛驗證 that aren't already listed can be
// published — every listing on this platform is backed by a real inspection
// (see MarketplaceListingView.vue's "已通過 MotoVerify 專業檢驗" framing).
async function loadEligibleVehicles(): Promise<void> {
  loadingEligible.value = true
  try {
    if (vehicleStore.vehicles.length === 0) await vehicleStore.fetchVehicles()
    const listedVehicleIds = new Set(listings.value.map((listing) => listing.vehicleId))
    const candidates: EligibleVehicle[] = []
    for (const vehicle of vehicleStore.vehicles) {
      if (listedVehicleIds.has(vehicle.id)) continue
      const verifications = await verificationService.listByVehicle(vehicle.id)
      const completed = verifications.find((v) => v.type === 'seller' && v.status === 'completed')
      if (!completed) continue
      const answers = await verificationService.listAnswers(completed.id)
      const eligible = answers.filter((answer) => answer.result !== 'not_applicable')
      const score =
        eligible.length === 0
          ? 100
          : Math.round(
              (eligible.filter((answer) => answer.result === 'normal').length / eligible.length) *
                100,
            )
      candidates.push({ vehicle, verificationId: completed.id, verificationScore: score })
    }
    eligibleVehicles.value = candidates
  } finally {
    loadingEligible.value = false
  }
}

onMounted(async () => {
  await loadListings()
  await loadEligibleVehicles()
})

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  photoFiles.value = input.files ? Array.from(input.files) : []
}

const selectedVehicleEntry = computed(
  () => eligibleVehicles.value.find((entry) => entry.vehicle.id === form.vehicleId) ?? null,
)

const canSubmit = computed(
  () =>
    !submitting.value &&
    !!selectedVehicleEntry.value &&
    !!form.priceTwd &&
    form.region.trim().length > 0 &&
    form.district.trim().length > 0 &&
    !!form.displacementCc &&
    form.transmission.trim().length > 0 &&
    form.color.trim().length > 0,
)

function resetForm(): void {
  form.vehicleId = ''
  form.priceTwd = null
  form.region = ''
  form.district = ''
  form.displacementCc = null
  form.transmission = ''
  form.color = ''
  form.transferable = true
  form.modified = false
  form.description = ''
  photoFiles.value = []
}

async function handleSubmit(): Promise<void> {
  const entry = selectedVehicleEntry.value
  if (!entry || !authStore.user || !canSubmit.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const listingId = listingService.reserveListingId()
    const uploadedUrls = await Promise.all(
      photoFiles.value.map((file, index) =>
        storageService.uploadFileAtPath(
          `marketplace/${listingId}/${Date.now()}-${index}.jpg`,
          file,
        ),
      ),
    )
    const photos = uploadedUrls.length > 0 ? uploadedUrls : (entry.vehicle.photos ?? [])

    await listingService.create(listingId, {
      brand: entry.vehicle.brand,
      model: entry.vehicle.model,
      year: entry.vehicle.manufactureYear ?? new Date().getFullYear(),
      mileageKm: entry.vehicle.mileage ?? 0,
      vehicleId: entry.vehicle.id,
      verificationId: entry.verificationId,
      priceTwd: form.priceTwd as number,
      region: form.region.trim(),
      district: form.district.trim(),
      transferable: form.transferable,
      displacementCc: form.displacementCc as number,
      transmission: form.transmission.trim(),
      color: form.color.trim(),
      modified: form.modified,
      description: form.description.trim(),
      photos,
      sellerId: authStore.user.id,
      sellerName: authStore.user.displayName || authStore.user.email || '賣家',
      sellerType: 'individual',
      sellerRating: 5,
      sellerReviewCount: 0,
      verificationScore: entry.verificationScore,
    })
    // Stays a single-click flow for the seller even though the data model
    // stages through draft first — see listingService.publish()'s doc comment.
    await listingService.publish(listingId, [entry.verificationId])
    showForm.value = false
    resetForm()
    await loadListings()
    await loadEligibleVehicles()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '刊登失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="我的刊登">
      <template #right>
        <button class="icon-button" aria-label="新增刊登" @click="showForm = !showForm">
          <Plus :size="20" />
        </button>
      </template>
    </AppHeader>

    <div class="content">
      <form v-if="showForm" class="listing-form" @submit.prevent="handleSubmit">
        <template v-if="!loadingEligible && eligibleVehicles.length === 0">
          <p class="hint">目前沒有可以刊登的車輛——請先完成一台車的車輛驗證。</p>
          <PrimaryButton
            variant="secondary"
            block
            @click="router.push('/verification?type=seller')"
          >
            前往驗車
          </PrimaryButton>
        </template>
        <template v-else>
          <label class="field">
            <span>選擇要刊登的車輛</span>
            <select v-model="form.vehicleId" required>
              <option value="" disabled>請選擇</option>
              <option
                v-for="entry in eligibleVehicles"
                :key="entry.vehicle.id"
                :value="entry.vehicle.id"
              >
                {{ entry.vehicle.manufactureYear }} {{ entry.vehicle.brand }}
                {{ entry.vehicle.model }}（驗證分數 {{ entry.verificationScore }}）
              </option>
            </select>
          </label>

          <label class="field">
            <span>售價 (NT$)</span>
            <input
              v-model.number="form.priceTwd"
              type="number"
              min="0"
              placeholder="例如 68000"
              required
            />
          </label>

          <div class="field-row">
            <label class="field">
              <span>地區</span>
              <input v-model="form.region" type="text" placeholder="例如 台北市" required />
            </label>
            <label class="field">
              <span>區域</span>
              <input v-model="form.district" type="text" placeholder="例如 大安區" required />
            </label>
          </div>

          <div class="field-row">
            <label class="field">
              <span>排氣量 (cc)</span>
              <input
                v-model.number="form.displacementCc"
                type="number"
                min="0"
                placeholder="例如 155"
                required
              />
            </label>
            <label class="field">
              <span>車身顏色</span>
              <input v-model="form.color" type="text" placeholder="例如 消光黑" required />
            </label>
          </div>

          <label class="field">
            <span>變速系統</span>
            <input
              v-model="form.transmission"
              type="text"
              placeholder="例如 CVT 無段變速"
              required
            />
          </label>

          <label class="toggle-field">
            <input v-model="form.transferable" type="checkbox" />
            <span>可過戶</span>
          </label>
          <label class="toggle-field">
            <input v-model="form.modified" type="checkbox" />
            <span>曾經改裝</span>
          </label>

          <label class="field">
            <span>車輛描述</span>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="跟買家說說這台車的狀況、保養紀錄..."
            />
          </label>

          <label class="field">
            <span>照片（第一張為封面照）</span>
            <input type="file" accept="image/*" multiple @change="handleFileChange" />
          </label>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <PrimaryButton type="submit" block :disabled="!canSubmit">
            {{ submitting ? '刊登中...' : '確認刊登' }}
          </PrimaryButton>
        </template>
      </form>

      <p v-if="loading">載入中...</p>
      <EmptyState
        v-else-if="listings.length === 0"
        :icon="Bike"
        title="尚未有任何刊登"
        description="完成一台車的車輛驗證後，就能把它刊登到交易市場。"
      />
      <div v-else class="listing-list">
        <button
          v-for="listing in listings"
          :key="listing.id"
          class="listing-row"
          @click="router.push(`/my-listings/${listing.id}`)"
        >
          <span class="thumb">
            <img
              v-if="listing.vehicleSnapshot.photos[0]"
              :src="listing.vehicleSnapshot.photos[0]"
              alt=""
            />
            <Bike v-else :size="24" color="var(--color-text-disabled)" />
          </span>
          <span class="info">
            <span class="title"
              >{{ listing.vehicleSnapshot.manufactureYear }} {{ listing.vehicleSnapshot.brand }}
              {{ listing.vehicleSnapshot.model }}</span
            >
            <span class="price">${{ listing.priceTwd.toLocaleString() }}</span>
          </span>
          <ChevronRight :size="18" color="var(--color-text-disabled)" />
        </button>
      </div>
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

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.listing-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.hint {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.field-row {
  display: flex;
  gap: var(--space-sm);
}

.field input,
.field select,
.field textarea {
  height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-primary);
  font-family: inherit;
  background: var(--color-background);
}

.field textarea {
  height: auto;
  padding: var(--space-sm) var(--space-md);
  resize: vertical;
}

.field input[type='file'] {
  padding: 8px;
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.error {
  font-size: 12.5px;
  color: var(--color-danger);
  margin: 0;
}

.listing-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.listing-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.price {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary);
}
</style>
