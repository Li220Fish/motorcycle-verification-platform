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

// Rule-based 設定（取代兩個更早的做法：先是「一次一個日期、每個日期時段各自
// 獨立」，後來改成「先設定一組共用時段、再多選日期」但那組時段是全部日期共
// 用——使用者實際的需求是「明天 15:00-18:00、後天卻是 12:00-16:00」這種不同
// 日期需要不同時段組合的情況，兩者都無法表達）。
//
// 這裡把 availableSlots（Firestore 儲存格式仍是 per-date 的 Record<date,
// string[]>，完全不用改 schema、BookingSheet.vue 等既有讀取端都不用動）依
// 「時段陣列的內容」重新分組成一條條「規則」——時段完全相同的日期自動合併成
// 同一條規則，時段不同的日期各自成一條規則，就像行事曆把同一組時間的多天events
// 顯示成一條、不同時間的另外開一條。每條規則可以獨立編輯（改時段/改日期）或
// 整條刪除，新增規則就是「先設定這組時段，再選要套用的日期」——原本兩步驟的
// UX 保留，只是現在可以重複做很多次，各自套用到不同日期。
const workingSlots = ref<Record<string, string[]>>({})

interface SlotRule {
  key: string
  times: string[]
  dates: string[]
}

const rules = computed<SlotRule[]>(() => {
  const byTimesKey = new Map<string, { times: string[]; dates: string[] }>()
  for (const [date, times] of Object.entries(workingSlots.value)) {
    if (!times || times.length === 0) continue
    const sortedTimes = [...times].sort()
    const key = sortedTimes.join(',')
    const entry = byTimesKey.get(key) ?? { times: sortedTimes, dates: [] }
    entry.dates.push(date)
    byTimesKey.set(key, entry)
  }
  return [...byTimesKey.values()]
    .map((entry) => ({ key: entry.times.join(','), times: entry.times, dates: entry.dates.sort() }))
    .sort((a, b) => (a.dates[0] ?? '').localeCompare(b.dates[0] ?? ''))
})

const highlightedDates = computed(() =>
  Object.keys(workingSlots.value).filter((date) => (workingSlots.value[date]?.length ?? 0) > 0),
)

function formatRuleDates(dates: string[]): string {
  return dates
    .map((date) => {
      const [, month, day] = date.split('-').map(Number)
      return `${month}/${day}`
    })
    .join('、')
}

// null = editor closed; NEW_RULE_KEY = adding a fresh rule; any other string
// = editing that existing rule (matches SlotRule.key, i.e. its joined times).
const NEW_RULE_KEY = '__new__'
const editingRuleKey = ref<string | null>(null)
const editingOriginalDates = ref<string[]>([])
const draftTimes = ref<string[]>([])
const draftDates = ref<Set<string>>(new Set())
const newTimeInput = ref('')
const savingRule = ref(false)
const ruleMessage = ref('')

const isEditorOpen = computed(() => editingRuleKey.value !== null)
const draftDatesArray = computed(() => [...draftDates.value])

// A seller who keeps the same handful of viewing times (e.g. always 10:00 /
// 14:00) shouldn't have to re-type them every time — remembers the last 5
// distinct times ever added, most-recent-first, so they show up as one-tap
// shortcuts. Purely a per-device UI convenience, not listing data, so
// localStorage is enough — no Firestore field for this.
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

function openNewRule(): void {
  editingRuleKey.value = NEW_RULE_KEY
  editingOriginalDates.value = []
  draftTimes.value = []
  draftDates.value = new Set()
  newTimeInput.value = ''
}

function openEditRule(rule: SlotRule): void {
  editingRuleKey.value = rule.key
  editingOriginalDates.value = rule.dates
  draftTimes.value = [...rule.times]
  draftDates.value = new Set(rule.dates)
  newTimeInput.value = ''
}

function closeEditor(): void {
  editingRuleKey.value = null
}

function addDraftTime(time: string = newTimeInput.value): void {
  if (!time || draftTimes.value.includes(time)) {
    newTimeInput.value = ''
    return
  }
  draftTimes.value = [...draftTimes.value, time].sort()
  rememberTime(time)
  newTimeInput.value = ''
}

function removeDraftTime(time: string): void {
  draftTimes.value = draftTimes.value.filter((existing) => existing !== time)
}

function toggleDraftDate(date: string): void {
  const next = new Set(draftDates.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  draftDates.value = next
}

async function persistWorkingSlots(next: Record<string, string[]>): Promise<void> {
  if (!listing.value) return
  await listingService.update(listing.value.id, { availableSlots: next })
  workingSlots.value = next
  listing.value = { ...listing.value, availableSlots: next }
}

async function saveRule(): Promise<void> {
  if (!listing.value) return
  savingRule.value = true
  ruleMessage.value = ''
  try {
    const next = { ...workingSlots.value }
    // A date this rule used to cover but is no longer checked goes back to
    // "closed" — unless something else (a different, still-open rule) had
    // already reclaimed it in the meantime, which the dates-changed check
    // here naturally never touches since we only ever delete dates that
    // were THIS rule's own.
    for (const date of editingOriginalDates.value) {
      if (!draftDates.value.has(date)) delete next[date]
    }
    for (const date of draftDates.value) {
      if (draftTimes.value.length > 0) next[date] = [...draftTimes.value]
      else delete next[date]
    }
    await persistWorkingSlots(next)
    ruleMessage.value = '已更新可預約時段'
    closeEditor()
  } catch {
    ruleMessage.value = '更新失敗，請稍後再試'
  } finally {
    savingRule.value = false
    setTimeout(() => {
      ruleMessage.value = ''
    }, 2500)
  }
}

async function deleteRule(rule: SlotRule): Promise<void> {
  if (!listing.value) return
  const next = { ...workingSlots.value }
  for (const date of rule.dates) delete next[date]
  await persistWorkingSlots(next)
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
          先設定一組時段，再選擇這組時段適用的日期——不同日期可以各自設定完全不同的時段組合（例如明天
          15:00-18:00、後天卻是 12:00-16:00），新增規則後可以再新增下一組。
        </p>

        <div v-if="rules.length > 0" class="rule-list">
          <div v-for="rule in rules" :key="rule.key" class="rule-card">
            <div class="rule-times">
              <span v-for="time in rule.times" :key="time" class="time-chip static">{{
                time
              }}</span>
            </div>
            <p class="rule-dates">{{ formatRuleDates(rule.dates) }}</p>
            <div class="rule-actions">
              <button type="button" class="rule-edit-btn" @click="openEditRule(rule)">編輯</button>
              <button type="button" class="rule-delete-btn" @click="deleteRule(rule)">刪除</button>
            </div>
          </div>
        </div>
        <p v-else class="empty-hint">還沒有設定任何可預約時段。</p>

        <button
          v-if="!isEditorOpen"
          type="button"
          class="add-time-btn"
          style="margin-top: var(--space-sm)"
          @click="openNewRule"
        >
          <Plus :size="14" /> 新增時段規則
        </button>

        <div v-if="isEditorOpen" class="rule-editor">
          <p class="sub-title">Step 1・設定時段</p>
          <div v-if="draftTimes.length > 0" class="time-chip-row">
            <span v-for="time in draftTimes" :key="time" class="time-chip">
              {{ time }}
              <button type="button" aria-label="移除此時段" @click="removeDraftTime(time)">
                <X :size="12" />
              </button>
            </span>
          </div>
          <p v-else class="empty-hint">還沒有設定任何時段。</p>
          <div v-if="recentTimes.length > 0" class="recent-time-row">
            <span class="recent-time-label">最近使用</span>
            <button
              v-for="time in recentTimes"
              :key="time"
              type="button"
              class="recent-time-chip"
              :disabled="draftTimes.includes(time)"
              @click="addDraftTime(time)"
            >
              {{ time }}
            </button>
          </div>
          <div class="add-time-row">
            <input v-model="newTimeInput" type="time" aria-label="新增時段" />
            <button
              type="button"
              class="add-time-btn"
              :disabled="!newTimeInput"
              @click="addDraftTime()"
            >
              新增時段
            </button>
          </div>

          <p class="sub-title" style="margin-top: var(--space-md)">Step 2・選擇適用日期</p>
          <p class="hint">點選日曆上的日期（可複選），這些日期都會套用上方這組時段。</p>
          <div class="calendar-card">
            <MonthCalendar
              :highlighted-dates="highlightedDates"
              :selected-dates="draftDatesArray"
              @select-date="toggleDraftDate"
            />
          </div>

          <div class="rule-editor-actions">
            <button type="button" class="rule-cancel-btn" @click="closeEditor">取消</button>
            <PrimaryButton :disabled="savingRule" @click="saveRule">
              {{ savingRule ? '儲存中...' : '儲存這組時段' }}
            </PrimaryButton>
          </div>
        </div>
        <p v-if="ruleMessage" class="feedback">{{ ruleMessage }}</p>
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

.rule-editor {
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

.rule-editor-actions {
  display: flex;
  align-items: stretch;
  gap: var(--space-sm);
}

.rule-editor-actions :deep(.btn) {
  flex: 1;
}

.rule-cancel-btn {
  flex: 0 0 auto;
  height: 44px;
  padding: 0 var(--space-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13.5px;
  font-weight: 700;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.rule-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  min-width: 0;
}

.rule-times {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rule-dates {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.rule-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: 4px;
}

.rule-edit-btn,
.rule-delete-btn {
  flex: 0 0 auto;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 700;
}

.rule-edit-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
}

.rule-delete-btn {
  border: 1px solid transparent;
  background: none;
  color: var(--color-danger, #dc2626);
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

.time-chip.static {
  padding: 6px 14px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
