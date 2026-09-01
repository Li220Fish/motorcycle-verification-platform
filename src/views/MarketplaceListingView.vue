<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bike, ChevronRight, Image, Star, Store } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import BookingSheet from '@/components/marketplace/BookingSheet.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { homeContentService } from '@/services/firebase/home-content.service'
import { listingService } from '@/services/firebase/listing.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

const props = defineProps<{ id: string }>()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const listing = ref<MockMarketListing | null>(null)
const loading = ref(true)
const bookedTimestamps = ref<number[]>([])

async function loadListing(): Promise<void> {
  loading.value = true
  listing.value = await homeContentService.getMarketplaceListing(props.id)
  loading.value = false
  bookedTimestamps.value = (await listingService.listAppointments(props.id)).map(
    (appointment) => appointment.scheduledAt,
  )
}

watch(() => props.id, loadListing, { immediate: true })

// Fallback for a listing with no imageUrl — no real photo exists for that
// DEMO listing, so a colored gradient + icon stands in for one, consistently
// across the app, rather than faking a stock photo.
const GRADIENTS = [
  'linear-gradient(135deg,#1f9d63,#0d5c39)',
  'linear-gradient(135deg,#e8912c,#7a4a10)',
  'linear-gradient(135deg,#6d5ce8,#2f1f7a)',
  'linear-gradient(135deg,#2f6fe8,#12306e)',
]
const heroGradient = computed(() => {
  let hash = 0
  for (const char of props.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
})

const noticeMessage = ref('')
function showNotYetAvailable(feature: string): void {
  noticeMessage.value = `「${feature}」尚未開放`
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

function showNotice(message: string): void {
  noticeMessage.value = message
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

const startingChat = ref(false)

/** "聊聊" opens a real conversation with the listing's seller — every DEMO
 * listing's sellerId points at one of the 3 seeded test accounts (see
 * marketplace-mock.ts), not a fictional user with no Firestore Auth UID. */
async function handleChatClick(): Promise<void> {
  const current = listing.value
  if (!current?.sellerId || !authStore.user) {
    showNotYetAvailable('聊聊')
    return
  }
  if (current.sellerId === authStore.user.id) {
    showNotice('這是您自己的刊登，無法與自己聊天')
    return
  }
  startingChat.value = true
  try {
    const conversationId = await chatStore.findOrCreateConversation(
      { displayName: authStore.user.displayName || authStore.user.email || '使用者' },
      current.sellerId,
      { displayName: current.sellerName },
      { listingId: current.id },
    )
    router.push(`/messages/${conversationId}`)
  } catch {
    showNotice('開啟聊天失敗，請稍後再試')
  } finally {
    startingChat.value = false
  }
}

const otherPhotoPlaceholders = Array.from({ length: 8 }, (_, index) => index)

const isOwnListing = computed(
  () => !!listing.value?.sellerId && listing.value.sellerId === authStore.user?.id,
)

const bookingSheetOpen = ref(false)
const bookingSubmitting = ref(false)

function handleOpenBooking(): void {
  if (isOwnListing.value) {
    showNotice('這是您自己的刊登，無法預約看車')
    return
  }
  if (!listing.value?.sellerId || !authStore.user) {
    showNotYetAvailable('立即預約')
    return
  }
  bookingSheetOpen.value = true
}

async function handleBookingSubmit(payload: { scheduledAt: number }): Promise<void> {
  const current = listing.value
  if (!current || !authStore.user) return
  bookingSubmitting.value = true
  try {
    await listingService.createAppointment({
      listingId: current.id,
      buyerId: authStore.user.id,
      buyerName: authStore.user.displayName || authStore.user.email || '買家',
      scheduledAt: payload.scheduledAt,
    })
    bookedTimestamps.value = [...bookedTimestamps.value, payload.scheduledAt]
    bookingSheetOpen.value = false
    showNotice('已送出預約，賣家將會與您聯繫')
  } catch {
    showNotice('預約失敗，請稍後再試')
  } finally {
    bookingSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="車輛詳情" back />

    <p v-if="loading" class="state-text">載入中...</p>
    <p v-else-if="!listing" class="state-text">找不到這台車輛。</p>
    <div v-else class="content">
      <div class="hero" :style="listing.imageUrl ? undefined : { background: heroGradient }">
        <span class="demo-tag">DEMO</span>
        <img v-if="listing.imageUrl" :src="listing.imageUrl" class="hero-img" alt="" />
        <Bike v-else :size="64" color="rgba(255,255,255,0.85)" />
      </div>

      <div class="body">
        <div class="title-row">
          <h2 class="title">{{ listing.year }} {{ listing.brand }} {{ listing.model }}</h2>
          <span v-if="listing.sellerType === 'dealer'" class="dealer-badge" title="認證車商">
            <Store :size="13" />
          </span>
        </div>

        <div class="price-row">
          <span class="price">${{ listing.priceTwd.toLocaleString() }}</span>
          <span v-if="listing.transferable" class="tag success">可過戶</span>
        </div>

        <p class="meta-row">
          {{ listing.region }}・{{ listing.district }} ・ 賣家 {{ listing.sellerName }}
        </p>

        <div class="info-card">
          <h3 class="card-title">車輛資訊</h3>
          <div class="info-row">
            <span>排氣量</span>
            <span>{{ listing.displacementCc }}cc</span>
          </div>
          <div class="info-row">
            <span>變速系統</span>
            <span>{{ listing.transmission }}</span>
          </div>
          <div class="info-row">
            <span>車身顏色</span>
            <span>{{ listing.color }}</span>
          </div>
          <div class="info-row">
            <span>里程數</span>
            <span>{{ listing.mileageKm.toLocaleString() }} km</span>
          </div>
          <div class="info-row">
            <span>是否改裝</span>
            <span class="tag" :class="listing.modified ? 'warning' : 'success'">
              {{ listing.modified ? '曾改裝' : '原廠無改裝' }}
            </span>
          </div>
        </div>

        <div class="action-row">
          <button class="chat-btn" :disabled="startingChat" @click="handleChatClick">
            {{ startingChat ? '開啟中...' : '聊聊' }}
          </button>
          <PrimaryButton block :disabled="isOwnListing" @click="handleOpenBooking">
            {{ isOwnListing ? '這是您的刊登' : '立即預約' }}
          </PrimaryButton>
        </div>

        <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

        <template v-if="listing.description">
          <h3 class="section-title">車輛描述</h3>
          <p class="description-text">{{ listing.description }}</p>
        </template>

        <!-- Every listing already requires a passing MotoVerify inspection
             before it can go live, so this always has a real report. -->
        <h3 class="section-title">驗車報告</h3>
        <button class="report-card" @click="router.push(`/marketplace/${listing.id}/report`)">
          <span class="score-badge">{{ listing.verificationScore }}</span>
          <span class="report-info">
            <span class="report-title">車輛檢驗報告</span>
            <span class="report-subtitle">已通過 MotoVerify 專業檢驗</span>
          </span>
          <ChevronRight :size="18" color="var(--color-text-disabled)" />
        </button>

        <template v-if="listing.photos && listing.photos.length > 0">
          <h3 class="section-title">其他照片</h3>
          <div class="photo-grid">
            <div v-for="photo in listing.photos" :key="photo" class="photo-real">
              <img :src="photo" alt="" />
            </div>
          </div>
        </template>
        <template v-else>
          <h3 class="section-title">其他照片</h3>
          <div class="photo-grid">
            <div v-for="index in otherPhotoPlaceholders" :key="index" class="photo-placeholder">
              <Image :size="22" color="var(--color-text-disabled)" />
            </div>
          </div>
        </template>

        <h3 class="section-title">賣家資訊</h3>
        <div class="seller-card">
          <div class="seller-avatar">{{ listing.sellerName[0] }}</div>
          <div class="seller-info">
            <span class="seller-name">{{ listing.sellerName }}</span>
            <span class="seller-rating">
              <Star :size="13" color="#e8912c" fill="#e8912c" />
              {{ listing.sellerRating.toFixed(1) }}（{{ listing.sellerReviewCount }} 則評價）
            </span>
          </div>
        </div>
      </div>
    </div>

    <BookingSheet
      :open="bookingSheetOpen"
      :submitting="bookingSubmitting"
      :available-dates="listing?.availableDates ?? []"
      :time-slots="listing?.timeSlots ?? []"
      :booked-timestamps="bookedTimestamps"
      @close="bookingSheetOpen = false"
      @submit="handleBookingSubmit"
    />
  </div>
</template>

<style scoped>
.state-text {
  padding: var(--space-lg) var(--space-md);
  color: var(--color-text-secondary);
}

.hero {
  position: relative;
  height: 260px;
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

.demo-tag {
  position: absolute;
  top: var(--space-md);
  left: var(--space-md);
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 999px;
  padding: 3px 10px;
}

.body {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.title {
  min-width: 0;
  font-size: 21px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.price-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.price {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-primary);
}

.tag {
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 10px;
}

.tag.success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.tag.warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.dealer-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  border-radius: 999px;
}

.info-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-md);
  margin-top: 4px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 var(--space-sm);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  font-size: 14px;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.info-row span:first-child {
  color: var(--color-text-secondary);
}

.action-row {
  display: flex;
  gap: var(--space-sm);
  margin-top: 4px;
}

.chat-btn {
  flex: 0 0 auto;
  min-width: 96px;
  height: 48px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 700;
}

.chat-btn:disabled {
  opacity: 0.6;
}

.notice {
  text-align: center;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  margin: var(--space-sm) 0 0;
}

.report-card {
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

.score-badge {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
}

.report-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.report-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.report-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.photo-placeholder {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-real {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-background);
}

.photo-real img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.description-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}

.seller-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.seller-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
}

.seller-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seller-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.seller-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}
</style>
