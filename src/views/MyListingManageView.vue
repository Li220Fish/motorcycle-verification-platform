<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bike, MessageCircle, Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import MonthCalendar from '@/components/marketplace/MonthCalendar.vue'
import { listingService } from '@/services/firebase/listing.service'
import { storageService } from '@/services/firebase/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { ListingAppointment } from '@/types/listing-appointment'

const props = defineProps<{ id: string }>()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const listing = ref<MockMarketListing | null>(null)
const loading = ref(true)

const priceInput = ref<number | null>(null)
const descriptionInput = ref('')
const saving = ref(false)
const saveMessage = ref('')

const uploadingPhoto = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const appointments = ref<ListingAppointment[]>([])
const loadingAppointments = ref(true)

async function loadListing(): Promise<void> {
  loading.value = true
  listing.value = await listingService.get(props.id)
  if (listing.value) {
    priceInput.value = listing.value.priceTwd
    descriptionInput.value = listing.value.description ?? ''
  }
  loading.value = false
}

async function loadAppointments(): Promise<void> {
  loadingAppointments.value = true
  try {
    appointments.value = await listingService.listAppointments(props.id)
  } finally {
    loadingAppointments.value = false
  }
}

onMounted(async () => {
  await loadListing()
  await loadAppointments()
})

const canSave = computed(() => {
  if (!listing.value) return false
  return (
    priceInput.value !== listing.value.priceTwd ||
    descriptionInput.value !== (listing.value.description ?? '')
  )
})

async function handleSave(): Promise<void> {
  if (!listing.value || !canSave.value) return
  saving.value = true
  saveMessage.value = ''
  try {
    const changes = {
      priceTwd: priceInput.value ?? listing.value.priceTwd,
      description: descriptionInput.value.trim(),
    }
    await listingService.update(listing.value.id, changes)
    listing.value = { ...listing.value, ...changes }
    saveMessage.value = '已儲存變更'
  } catch {
    saveMessage.value = '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
    setTimeout(() => {
      saveMessage.value = ''
    }, 2500)
  }
}

function triggerPhotoUpload(): void {
  fileInput.value?.click()
}

async function handlePhotoChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (files.length === 0 || !listing.value) return
  uploadingPhoto.value = true
  try {
    const currentListing = listing.value
    const uploaded = await Promise.all(
      files.map((file, index) =>
        storageService.uploadFileAtPath(
          `marketplace/${currentListing.id}/${Date.now()}-${index}.jpg`,
          file,
        ),
      ),
    )
    const nextPhotos = [...currentListing.vehicleSnapshot.photos, ...uploaded]
    await listingService.updatePhotos(currentListing.id, nextPhotos)
    listing.value = {
      ...currentListing,
      vehicleSnapshot: { ...currentListing.vehicleSnapshot, photos: nextPhotos },
    }
  } finally {
    uploadingPhoto.value = false
  }
}

async function handleSetCover(url: string): Promise<void> {
  if (!listing.value) return
  const currentListing = listing.value
  const reordered = [url, ...currentListing.vehicleSnapshot.photos.filter((p) => p !== url)]
  await listingService.updatePhotos(currentListing.id, reordered)
  listing.value = {
    ...currentListing,
    vehicleSnapshot: { ...currentListing.vehicleSnapshot, photos: reordered },
  }
}

// A shared set of common times rather than per-date custom slots — keeps
// the seller's setup to a single toggle list applied to every open date,
// matching the reference design's "same slots every open day" layout.
const PRESET_TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '11:30',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '18:00',
  '19:30',
]

async function toggleAvailableDate(date: string): Promise<void> {
  if (!listing.value) return
  const current = listing.value.availableDates ?? []
  const next = current.includes(date)
    ? current.filter((existing) => existing !== date)
    : [...current, date].sort()
  await listingService.update(listing.value.id, { availableDates: next })
  listing.value = { ...listing.value, availableDates: next }
}

async function toggleTimeSlot(time: string): Promise<void> {
  if (!listing.value) return
  const current = listing.value.timeSlots ?? []
  const next = current.includes(time)
    ? current.filter((existing) => existing !== time)
    : [...current, time].sort()
  await listingService.update(listing.value.id, { timeSlots: next })
  listing.value = { ...listing.value, timeSlots: next }
}

// The chat store already holds every conversation the current (seller) user
// is a member of, kept live by AppLayout's global subscription — filtering
// client-side avoids a second Firestore query and any array-contains +
// equality composite-index requirement.
const inquiries = computed(() =>
  chatStore.conversations.filter((conversation) => conversation.context?.listingId === props.id),
)

function inquiryOtherName(conversation: (typeof inquiries.value)[number]): string {
  const otherId = conversation.memberIds.find((memberId) => memberId !== authStore.user?.id)
  return otherId ? (conversation.memberSnapshots[otherId]?.displayName ?? '買家') : '買家'
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <AppHeader title="刊登管理" back />

    <p v-if="loading" class="state-text">載入中...</p>
    <p v-else-if="!listing" class="state-text">找不到這筆刊登。</p>
    <div v-else class="content">
      <div class="photo-section">
        <div class="cover">
          <img
            v-if="listing.vehicleSnapshot.photos[0]"
            :src="listing.vehicleSnapshot.photos[0]"
            alt=""
          />
          <Bike v-else :size="48" color="var(--color-text-disabled)" />
        </div>
        <div v-if="listing.vehicleSnapshot.photos.length > 1" class="gallery">
          <button
            v-for="photo in listing.vehicleSnapshot.photos.slice(1)"
            :key="photo"
            class="gallery-item"
            title="設為封面照"
            @click="handleSetCover(photo)"
          >
            <img :src="photo" alt="" />
          </button>
        </div>
        <button class="add-photo-btn" :disabled="uploadingPhoto" @click="triggerPhotoUpload">
          <Plus :size="16" /> {{ uploadingPhoto ? '上傳中...' : '新增照片' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden-file"
          @change="handlePhotoChange"
        />
      </div>

      <div class="edit-card">
        <h3 class="card-title">
          {{ listing.vehicleSnapshot.manufactureYear }} {{ listing.vehicleSnapshot.brand }}
          {{ listing.vehicleSnapshot.model }}
        </h3>

        <label class="field">
          <span>售價 (NT$)</span>
          <input v-model.number="priceInput" type="number" min="0" />
        </label>

        <label class="field">
          <span>車輛描述</span>
          <textarea
            v-model="descriptionInput"
            rows="4"
            placeholder="跟買家說說這台車的狀況、保養紀錄..."
          />
        </label>

        <PrimaryButton block :disabled="!canSave || saving" @click="handleSave">
          {{ saving ? '儲存中...' : '儲存變更' }}
        </PrimaryButton>
        <p v-if="saveMessage" class="feedback">{{ saveMessage }}</p>
      </div>

      <div class="section">
        <h3 class="section-title">設定可預約時段</h3>
        <p class="hint">點選日期開放／取消該天的賞車預約，買家只會看到您開放的日期與下方時段。</p>
        <div class="calendar-card">
          <MonthCalendar
            :highlighted-dates="listing.availableDates ?? []"
            @select-date="toggleAvailableDate"
          />
        </div>
        <p class="sub-title">提供時段</p>
        <div class="slot-chip-row">
          <button
            v-for="time in PRESET_TIME_SLOTS"
            :key="time"
            class="slot-chip"
            :class="{ active: (listing.timeSlots ?? []).includes(time) }"
            @click="toggleTimeSlot(time)"
          >
            {{ time }}
          </button>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">目前詢問（{{ inquiries.length }}）</h3>
        <p v-if="inquiries.length === 0" class="empty-hint">目前還沒有人詢問這筆刊登。</p>
        <div v-else class="inquiry-list">
          <button
            v-for="conversation in inquiries"
            :key="conversation.id"
            class="inquiry-row"
            @click="router.push(`/messages/${conversation.id}`)"
          >
            <span class="inquiry-info">
              <span class="inquiry-name">{{ inquiryOtherName(conversation) }}</span>
              <span class="inquiry-preview">{{
                conversation.lastMessage?.text || '尚無訊息'
              }}</span>
            </span>
            <MessageCircle :size="16" color="var(--color-text-disabled)" />
          </button>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">已預約看車時間</h3>
        <p v-if="loadingAppointments" class="empty-hint">載入中...</p>
        <p v-else-if="appointments.length === 0" class="empty-hint">目前還沒有人預約看車。</p>
        <div v-else class="appointment-list">
          <div v-for="appointment in appointments" :key="appointment.id" class="appointment-row">
            <span class="appointment-time">{{ formatDateTime(appointment.scheduledAt) }}</span>
            <span class="appointment-buyer">{{ appointment.buyerName }}</span>
            <span v-if="appointment.note" class="appointment-note">{{ appointment.note }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.state-text {
  padding: var(--space-lg) var(--space-md);
  color: var(--color-text-secondary);
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.photo-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.cover {
  height: 200px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.gallery-item {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: none;
  padding: 0;
  background: var(--color-background);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.add-photo-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
}

.add-photo-btn:disabled {
  opacity: 0.6;
}

.hidden-file {
  display: none;
}

.edit-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.field input,
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

.feedback {
  text-align: center;
  font-size: 12.5px;
  color: var(--color-success);
  margin: 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.empty-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.hint {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: -6px 0 0;
}

.calendar-card {
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.sub-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.slot-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.slot-chip {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.slot-chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  font-weight: 700;
}

.inquiry-list,
.appointment-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.inquiry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: left;
}

.inquiry-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inquiry-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.inquiry-preview {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.appointment-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.appointment-time {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary);
}

.appointment-buyer {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.appointment-note {
  flex-basis: 100%;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
