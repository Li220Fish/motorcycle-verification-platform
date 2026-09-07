<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bike, MessageCircle, Plus, Star, X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PhotoLightbox from '@/components/common/PhotoLightbox.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import MonthCalendar from '@/components/marketplace/MonthCalendar.vue'
import { listingService } from '@/services/firebase/listing.service'
import { storageService } from '@/services/firebase/storage.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import { resolveAvailableSlots } from '@/data/home/marketplace-mock'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { ListingAppointment } from '@/types/listing-appointment'
import type { Unsubscribe } from 'firebase/firestore'

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
const activePhotoUrl = ref<string | null>(null)
// Matches wherever the photo actually displays — see VehiclePhotoGallery.vue's
// identical comment (cover ~16:9, gallery thumbnails 1:1 squares).
const activePhotoAspect = ref(1)
const replacingPhoto = ref(false)

const appointments = ref<ListingAppointment[]>([])
const loadingAppointments = ref(true)
// Live subscription (Task C2) instead of a one-time fetch — a seller sitting
// on this page now sees a new incoming booking (or a buyer's cancellation)
// appear without reloading.
let unsubscribeAppointments: Unsubscribe | null = null

async function loadListing(): Promise<void> {
  loading.value = true
  listing.value = await listingService.get(props.id)
  if (listing.value) {
    priceInput.value = listing.value.priceTwd
    descriptionInput.value = listing.value.description ?? ''
    // Seeds the editable per-date map from whatever the listing already has —
    // including a one-time read of the legacy shared availableDates/timeSlots
    // shape, so a listing set up before per-date slots existed doesn't look
    // like it lost its availability the first time this page loads.
    workingSlots.value = resolveAvailableSlots(listing.value)
  }
  loading.value = false
}

function subscribeAppointments(): void {
  loadingAppointments.value = true
  unsubscribeAppointments?.()
  unsubscribeAppointments = listingService.subscribeAppointments(props.id, (list) => {
    appointments.value = list
    loadingAppointments.value = false
  })
}

onMounted(async () => {
  await loadListing()
  subscribeAppointments()
})

onUnmounted(() => unsubscribeAppointments?.())

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
      files.map(async (file, index) => {
        // Same resize/re-encode as verification evidence / listing creation
        // (MyListingsView.vue) — keeps added-later photos consistent with
        // whatever the listing was created with instead of full camera size.
        const { blob } = await imageCompressionService.compressImage(file)
        return storageService.uploadFileAtPath(
          `marketplace/${currentListing.id}/${Date.now()}-${index}.jpg`,
          blob,
        )
      }),
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

function openPhoto(url: string, aspect: number): void {
  activePhotoUrl.value = url
  activePhotoAspect.value = aspect
}

function closePhoto(): void {
  if (replacingPhoto.value) return
  activePhotoUrl.value = null
}

async function handleCropConfirmed(blob: Blob): Promise<void> {
  const originalUrl = activePhotoUrl.value
  if (!originalUrl || !listing.value) return
  replacingPhoto.value = true
  try {
    const currentListing = listing.value
    const { blob: compressed } = await imageCompressionService.compressImage(blob)
    const newUrl = await storageService.uploadFileAtPath(
      `marketplace/${currentListing.id}/${Date.now()}-crop.jpg`,
      compressed,
    )
    const nextPhotos = currentListing.vehicleSnapshot.photos.map((photo) =>
      photo === originalUrl ? newUrl : photo,
    )
    await listingService.updatePhotos(currentListing.id, nextPhotos)
    listing.value = {
      ...currentListing,
      vehicleSnapshot: { ...currentListing.vehicleSnapshot, photos: nextPhotos },
    }
    activePhotoUrl.value = null
  } finally {
    replacingPhoto.value = false
  }
}

// Per-date custom viewing times (replaces the old shared-preset-button
// list) — each open date keeps its own freely-chosen times, so e.g.
// tomorrow 10:00-12:00 and the day after a completely different (or no)
// window is fully expressible, including times a fixed preset list never
// offered (a buyer wanting a 凌晨 viewing).
const workingSlots = ref<Record<string, string[]>>({})
const editingDate = ref<string | null>(null)
const newTimeInput = ref('')

// A seller who keeps the same handful of viewing times (e.g. always 10:00 /
// 14:00) shouldn't have to re-pick them one date at a time — remembers the
// last 5 distinct times added across ANY date, most-recent-first, so they
// show up as one-tap shortcuts instead. Purely a per-device UI convenience,
// not listing data, so localStorage is enough — no Firestore field for this.
const RECENT_TIMES_KEY = 'motoverify:recentViewingTimes'
const MAX_RECENT_TIMES = 5

function loadRecentTimes(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TIMES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

const recentTimes = ref<string[]>(loadRecentTimes())

function rememberTime(time: string): void {
  recentTimes.value = [time, ...recentTimes.value.filter((existing) => existing !== time)].slice(
    0,
    MAX_RECENT_TIMES,
  )
  try {
    localStorage.setItem(RECENT_TIMES_KEY, JSON.stringify(recentTimes.value))
  } catch {
    // best-effort only — worst case the shortcut row just doesn't grow
  }
}

const highlightedDates = computed(() =>
  Object.keys(workingSlots.value).filter((date) => (workingSlots.value[date]?.length ?? 0) > 0),
)

const timesForEditingDate = computed(() =>
  editingDate.value ? (workingSlots.value[editingDate.value] ?? []) : [],
)

function handleSelectDate(date: string): void {
  editingDate.value = date
  newTimeInput.value = ''
}

async function persistSlots(next: Record<string, string[]>): Promise<void> {
  if (!listing.value) return
  workingSlots.value = next
  await listingService.update(listing.value.id, { availableSlots: next })
  listing.value = { ...listing.value, availableSlots: next }
}

async function addTime(time: string = newTimeInput.value): Promise<void> {
  const date = editingDate.value
  if (!date || !time) return
  const current = workingSlots.value[date] ?? []
  if (current.includes(time)) {
    newTimeInput.value = ''
    return
  }
  const next = { ...workingSlots.value, [date]: [...current, time].sort() }
  await persistSlots(next)
  rememberTime(time)
  newTimeInput.value = ''
}

async function removeTime(date: string, time: string): Promise<void> {
  const current = workingSlots.value[date] ?? []
  const remaining = current.filter((existing) => existing !== time)
  const next = { ...workingSlots.value }
  if (remaining.length > 0) next[date] = remaining
  else delete next[date]
  await persistSlots(next)
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

// UI copy for appointment status is always 婉拒 (never 拒絕) — see
// ChatRoomView.vue's existing decline button/system-message wording, kept
// consistent here.
function appointmentStatusLabel(status: ListingAppointment['status']): string {
  if (status === 'approved') return '已確認'
  if (status === 'declined') return '已婉拒'
  if (status === 'cancelled') return '買家已取消'
  return '待確認'
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
            @click="openPhoto(listing.vehicleSnapshot.photos[0], 16 / 9)"
          />
          <Bike v-else :size="48" color="var(--color-text-disabled)" />
        </div>
        <div v-if="listing.vehicleSnapshot.photos.length > 1" class="gallery">
          <div
            v-for="photo in listing.vehicleSnapshot.photos.slice(1)"
            :key="photo"
            class="gallery-item"
          >
            <img :src="photo" alt="" @click="openPhoto(photo, 1)" />
            <button class="gallery-cover-btn" title="設為封面照" @click="handleSetCover(photo)">
              <Star :size="11" />
            </button>
          </div>
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
        <p class="hint">
          點選日曆上的日期，個別設定當天開放的賞車時段——不同日期可以設定完全不同的時間，時間也是自由輸入，包含凌晨等任何時段都可以開放。
        </p>
        <div class="calendar-card">
          <MonthCalendar
            :highlighted-dates="highlightedDates"
            :selected-date="editingDate"
            @select-date="handleSelectDate"
          />
        </div>

        <div v-if="editingDate" class="date-editor">
          <p class="sub-title">{{ editingDate }} 的開放時段</p>
          <div v-if="timesForEditingDate.length > 0" class="time-chip-row">
            <span v-for="time in timesForEditingDate" :key="time" class="time-chip">
              {{ time }}
              <button type="button" aria-label="移除此時段" @click="removeTime(editingDate, time)">
                <X :size="12" />
              </button>
            </span>
          </div>
          <p v-else class="empty-hint">這天還沒有開放任何時段。</p>
          <div v-if="recentTimes.length > 0" class="recent-time-row">
            <span class="recent-time-label">最近使用</span>
            <button
              v-for="time in recentTimes"
              :key="time"
              type="button"
              class="recent-time-chip"
              :disabled="timesForEditingDate.includes(time)"
              @click="addTime(time)"
            >
              {{ time }}
            </button>
          </div>
          <div class="add-time-row">
            <input v-model="newTimeInput" type="time" aria-label="新增時段" />
            <button type="button" class="add-time-btn" :disabled="!newTimeInput" @click="addTime()">
              新增時段
            </button>
          </div>
        </div>
        <p v-else class="empty-hint">請先在上方日曆選擇一個日期進行設定。</p>
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
          <div
            v-for="appointment in appointments"
            :key="appointment.id"
            class="appointment-row"
            :class="appointment.status"
          >
            <span class="appointment-time">{{ formatDateTime(appointment.scheduledAt) }}</span>
            <span class="appointment-buyer">{{ appointment.buyerName }}</span>
            <span v-if="appointment.note" class="appointment-note">{{ appointment.note }}</span>
            <span class="appointment-status">{{ appointmentStatusLabel(appointment.status) }}</span>
          </div>
        </div>
      </div>
    </div>

    <PhotoLightbox
      v-if="activePhotoUrl"
      :image-url="activePhotoUrl"
      :aspect-ratio="activePhotoAspect"
      :uploading="replacingPhoto"
      @close="closePhoto"
      @crop-confirmed="handleCropConfirmed"
    />
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
  cursor: pointer;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-background);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.gallery-cover-btn {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.field input,
.field textarea {
  width: 100%;
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

.date-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  /* Own stacking/overflow context so nothing inside can push the page wider
     than the viewport, regardless of content length. */
  min-width: 0;
}

.time-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.time-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
}

.time-chip button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--color-primary);
  flex: 0 0 auto;
}

.recent-time-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.recent-time-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.recent-time-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
}

.recent-time-chip:disabled {
  opacity: 0.45;
}

.add-time-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.add-time-row input[type='time'] {
  flex: 1 1 140px;
  min-width: 0;
  height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-background);
}

.add-time-btn {
  flex: 0 0 auto;
  height: 44px;
  padding: 0 var(--space-lg);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
}

.add-time-btn:disabled {
  opacity: 0.5;
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

.appointment-status {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.appointment-row.approved .appointment-status {
  color: var(--color-success);
}

.appointment-row.declined,
.appointment-row.cancelled {
  opacity: 0.55;
}

.appointment-row.declined .appointment-status,
.appointment-row.cancelled .appointment-status {
  color: var(--color-danger);
}
</style>
