<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  Bike,
  ChevronRight,
  Heart,
  Image,
  Info,
  Share2,
  ShieldCheck,
  Star,
  Store,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import BookingSheet from '@/components/marketplace/BookingSheet.vue'
import PhotoGalleryLightbox from '@/components/marketplace/PhotoGalleryLightbox.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'
import { useVerificationCorePhotos } from '@/composables/useVerificationCorePhotos'
import { chatService } from '@/services/chat/chat.service'
import { auth } from '@/services/firebase/firebase'
import { listingService } from '@/services/firebase/listing.service'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import { resolveAvailableSlots } from '@/data/home/marketplace-mock'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { Unsubscribe } from 'firebase/firestore'

const props = defineProps<{ id: string }>()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const { t } = useI18n()

// Plain synchronous statement during setup() — NOT inside onMounted() —
// specifically so it starts before the `watch(() => props.id, loadListing,
// { immediate: true })` below, which fires a real Firestore read
// synchronously as part of THIS SAME setup() pass. onMounted callbacks only
// run after setup() returns and the component is actually mounted, i.e.
// strictly later; leaving the sign-in there left a real gap where a fully
// fresh visitor's first read could fire while still unauthenticated. Same
// fix, same reasoning as SharedReportView.vue's own version of this.
authStore.initialize()
if (!auth.currentUser) void authStore.signInAnonymous()

const listing = ref<MockMarketListing | null>(null)
const loading = ref(true)
const bookedTimestamps = ref<number[]>([])
const isFavorite = ref(false)

/**
 * This route now allows an anonymous visitor (router/index.ts's
 * `allowAnonymous`, for the "分享的連結會是車子頁面" link — see that route's
 * own comment). A real account and an anonymous one are both truthy
 * `authStore.user`, so every action that should actually require logging in
 * (favorite/chat/book) checks THIS, not `!!authStore.user` — see each
 * handler below.
 */
const isRealUser = computed(() => authStore.user !== null && !authStore.user.isAnonymous)

// Fallback for listings with no vehicleSnapshot.modelId (typed brand/model
// text rather than picked from the 車輛選單資訊 catalog) — best-effort text
// match, see vehicleModelService.findModelIdByText's own doc comment for why
// this is "probably this model," not a guaranteed-correct link like a real
// modelId. Resolved once per listing id, not on every live snapshot update.
const fallbackModelId = ref<string | null>(null)
let fallbackResolvedForListingId: string | null = null

async function maybeResolveFallbackModelId(current: MockMarketListing): Promise<void> {
  if (current.vehicleSnapshot.modelId) return
  if (fallbackResolvedForListingId === current.id) return
  fallbackResolvedForListingId = current.id
  const profiles = await vehicleModelService.listProfiles().catch(() => [])
  fallbackModelId.value = vehicleModelService.findModelIdByText(
    current.vehicleSnapshot.brand,
    current.vehicleSnapshot.model,
    profiles,
  )
}

const learnVehicleModelId = computed(
  () => listing.value?.vehicleSnapshot.modelId ?? fallbackModelId.value,
)

// Live subscription (not a one-time fetch) so favoriteCount — and anything
// else about the listing — updates in real time while this page is open,
// e.g. another buyer favoriting it while this one is looking.
let unsubscribeListing: Unsubscribe | null = null
// Same for appointments (Task C2) — a one-time fetch here is exactly why two
// buyers loading the page around the same time could both see a slot as
// free. Only 'pending'/'approved' actually occupy a slot — a declined or
// cancelled appointment must free it back up, which the old one-time fetch
// never did either (it kept every appointment forever).
let unsubscribeAppointments: Unsubscribe | null = null

/** firestore.rules' appointments read rule only allows a doc via
 *  `buyerId == myUid()` or the listing's own `sellerId == myUid()` — the
 *  same "list query must be narrowed to match the rule" constraint
 *  listing.service.ts's subscribeAppointmentsForBuyer doc comment already
 *  explains. `subscribeAppointments` (unfiltered — every buyer's
 *  appointments) is only safe for the SELLER viewing their own listing; a
 *  buyer calling it here got a permission-denied on every page load
 *  (console-only, but still a real bug — found 2026-09 live). A buyer
 *  instead only ever needs to see when THEIR OWN pending/approved request
 *  occupies a slot, via subscribeAppointmentsForBuyer. */
function subscribeAppointmentsForCurrentViewer(sellerId: string): void {
  unsubscribeAppointments?.()
  const uid = authStore.user?.id
  if (!uid) {
    bookedTimestamps.value = []
    return
  }
  const handleAppointments = (appointments: { status: string; scheduledAt: number }[]): void => {
    bookedTimestamps.value = appointments
      .filter(
        (appointment) => appointment.status === 'pending' || appointment.status === 'approved',
      )
      .map((appointment) => appointment.scheduledAt)
  }
  unsubscribeAppointments =
    uid === sellerId
      ? listingService.subscribeAppointments(props.id, handleAppointments)
      : listingService.subscribeAppointmentsForBuyer(props.id, uid, handleAppointments)
}

async function loadListing(): Promise<void> {
  loading.value = true
  fallbackModelId.value = null
  fallbackResolvedForListingId = null
  unsubscribeListing?.()
  unsubscribeListing = listingService.subscribeListing(props.id, (updated) => {
    listing.value = updated
    loading.value = false
    if (updated) {
      void maybeResolveFallbackModelId(updated)
      if (updated.sellerId) subscribeAppointmentsForCurrentViewer(updated.sellerId)
    }
  })
  if (authStore.user) {
    isFavorite.value = (await listingService.listFavoriteIds(authStore.user.id)).includes(props.id)
  }
}

watch(() => props.id, loadListing, { immediate: true })

onUnmounted(() => {
  unsubscribeListing?.()
  unsubscribeAppointments?.()
})

// --- 其他照片: the listing's OWN extra uploaded photos (vehicleSnapshot.
// photos beyond the cover — always shown, verification or not) PLUS the 6
// core appearance photos from the listing's verification report, when one
// exists (only ever one verificationId per listing today — see
// listingService.publish's own comment — so "最新一筆" is simply [0]). A
// listing with no verification evidence at all (found live 2026-09) must
// still show whatever real photos the seller separately uploaded — this
// section is additive over both sources, never a replacement of one by the
// other.
const verificationId = computed(() => listing.value?.verificationIds[0])
const verificationPhotos = useVerificationCorePhotos(verificationId)

const otherPhotos = computed(() => {
  const uploaded = listing.value?.vehicleSnapshot.photos.slice(1) ?? []
  return [...uploaded, ...verificationPhotos.value]
})

// Cover photo first (matches the physical hero image above), then 其他照片 —
// this is the exact set the lightbox filmstrip below browses.
const galleryPhotos = computed(() => {
  const cover = listing.value?.vehicleSnapshot.photos[0]
  return [cover, ...otherPhotos.value].filter((url): url is string => !!url)
})

const lightboxIndex = ref<number | null>(null)
function openLightbox(url: string): void {
  const index = galleryPhotos.value.indexOf(url)
  if (index >= 0) lightboxIndex.value = index
}

async function handleToggleFavorite(): Promise<void> {
  if (!isRealUser.value) {
    showNotice(t('listing', 'needLoginFavorite'))
    return
  }
  const uid = authStore.user!.id
  if (isFavorite.value) {
    isFavorite.value = false
    await listingService.removeFavorite(uid, props.id)
  } else {
    isFavorite.value = true
    await listingService.addFavorite(uid, props.id)
  }
}

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
  noticeMessage.value = t('listing', 'featureNotAvailable', { feature })
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
  if (!current?.sellerId) {
    showNotYetAvailable(t('listing', 'chatButton'))
    return
  }
  if (!isRealUser.value) {
    showNotice(t('listing', 'needLoginChat'))
    return
  }
  if (current.sellerId === authStore.user!.id) {
    showNotice(t('listing', 'cantChatSelf'))
    return
  }
  startingChat.value = true
  try {
    const conversationId = await chatStore.findOrCreateConversation(
      {
        displayName:
          authStore.user!.displayName || authStore.user!.email || t('listing', 'defaultUser'),
        photoUrl: authStore.user!.photoUrl,
      },
      current.sellerId,
      { displayName: current.sellerName },
      { listingId: current.id },
    )
    router.push(`/messages/${conversationId}`)
  } catch {
    showNotice(t('listing', 'chatOpenFailed'))
  } finally {
    startingChat.value = false
  }
}

const otherPhotoPlaceholders = Array.from({ length: 8 }, (_, index) => index)

/**
 * "查看報告" — routes through `/share/:id` (SharedReportView.vue), NOT
 * `/verification/:id/report` (VerificationReportView.vue, which still
 * hard-requires a real login via its own route's requiresAuth). This page
 * now allows an anonymous visitor (router/index.ts's `allowAnonymous`), so
 * the report it links to has to be reachable by one too — /share/:id
 * already shows full detail for any REAL signed-in account and the
 * restricted (photos/AI notes hidden) view otherwise, so this one
 * destination correctly serves both without this view needing its own copy
 * of that logic. DEMO fallback (`/marketplace/:id/report`, no real
 * verification behind the listing) is unchanged — MarketplaceReportView.vue
 * has nothing real to restrict either way.
 */
const reportPath = computed(() => {
  const current = listing.value
  const firstVerificationId = current?.verificationIds[0]
  if (!current || !firstVerificationId) return `/marketplace/${props.id}/report`
  const snapshot = current.vehicleSnapshot
  const params = new URLSearchParams({ brand: snapshot.brand, model: snapshot.model })
  if (snapshot.manufactureYear) params.set('year', String(snapshot.manufactureYear))
  return `/share/${firstVerificationId}?${params.toString()}`
})

/**
 * AppHeader's 分享 icon — always this listing's OWN page
 * (`/marketplace/:id`, itself now anonymous-visitable — see
 * router/index.ts's `allowAnonymous` on this route), never a direct link
 * straight to the verification report. "分享的連結會是車子頁面" — someone
 * who opens it lands on the same page a real visitor would, sees the
 * listing itself, and reaches the (separately restricted) report through
 * this page's own "查看報告" button (reportPath above), same path either way.
 */
const shareLink = computed(() =>
  new URL(`/marketplace/${props.id}`, window.location.origin).toString(),
)

const shareMenuOpen = ref(false)

async function handleCopyShareLink(): Promise<void> {
  shareMenuOpen.value = false
  await navigator.clipboard.writeText(shareLink.value)
  showNotice(t('listing', 'linkCopied'))
}

async function handleShareMore(): Promise<void> {
  shareMenuOpen.value = false
  if (navigator.share) {
    try {
      await navigator.share({ title: t('listing', 'shareTitle'), url: shareLink.value })
    } catch {
      // user cancelled the native share sheet — nothing to do
    }
    return
  }
  showNotYetAvailable(t('listing', 'shareMore'))
}

const isOwnListing = computed(
  () => !!listing.value?.sellerId && listing.value.sellerId === authStore.user?.id,
)

const bookingSheetOpen = ref(false)
const bookingSubmitting = ref(false)

function handleOpenBooking(): void {
  if (isOwnListing.value) {
    showNotice(t('listing', 'cantBookSelf'))
    return
  }
  if (!listing.value?.sellerId) {
    showNotYetAvailable(t('listing', 'bookNow'))
    return
  }
  if (!isRealUser.value) {
    showNotice(t('listing', 'needLoginBook'))
    return
  }
  bookingSheetOpen.value = true
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleBookingSubmit(payload: { scheduledAt: number }): Promise<void> {
  const current = listing.value
  // Defense-in-depth — handleOpenBooking already gates isRealUser before
  // bookingSheetOpen can ever become true, but BookingSheet.vue's submit
  // event is the real write path, so it checks again rather than trusting
  // that gate alone.
  if (!current?.sellerId || !isRealUser.value) return
  const user = authStore.user!
  bookingSubmitting.value = true
  try {
    // Create the conversation BEFORE the appointment doc — the appointment's
    // onAppointmentCreated Cloud Function looks up this conversation (by
    // seller+buyer+listingId) to link the "新的看車預約" notification straight
    // to the chat instead of the listing page, so it must already exist by
    // the time that trigger fires (also gives the seller somewhere to see
    // and respond to the booking even if they never separately tap "聊聊" —
    // see ChatRoomView.vue's appointment banner).
    const conversationId = await chatStore.findOrCreateConversation(
      {
        displayName: user.displayName || user.email || t('listing', 'defaultUser'),
        photoUrl: user.photoUrl,
      },
      current.sellerId,
      { displayName: current.sellerName },
      { listingId: current.id },
    )
    await listingService.createAppointment({
      listingId: current.id,
      buyerId: user.id,
      buyerName: user.displayName || user.email || t('listing', 'defaultBuyer'),
      scheduledAt: payload.scheduledAt,
    })
    bookedTimestamps.value = [...bookedTimestamps.value, payload.scheduledAt]

    await chatService.sendSystemNote(
      conversationId,
      user.id,
      [current.sellerId],
      t('listing', 'systemNoteBooking', { time: formatDateTime(payload.scheduledAt) }),
      {
        displayName: user.displayName || user.email || t('listing', 'defaultBuyer'),
        photoUrl: user.photoUrl,
      },
    )

    bookingSheetOpen.value = false
    showNotice(t('listing', 'bookingSent'))
  } catch {
    showNotice(t('listing', 'bookingFailed'))
  } finally {
    bookingSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader :title="t('listing', 'title')" back>
      <template #right>
        <button
          class="icon-button"
          :aria-label="t('listing', 'share')"
          @click="shareMenuOpen = !shareMenuOpen"
        >
          <Share2 :size="20" />
        </button>
      </template>
    </AppHeader>

    <div v-if="shareMenuOpen" class="menu">
      <button @click="handleCopyShareLink">{{ t('listing', 'copyLink') }}</button>
      <button @click="handleShareMore">{{ t('listing', 'shareMore') }}</button>
    </div>

    <p v-if="loading" class="state-text">{{ t('common', 'loading') }}</p>
    <p v-else-if="!listing" class="state-text">{{ t('listing', 'notFound') }}</p>
    <div v-else class="content">
      <div
        class="hero"
        :style="listing.vehicleSnapshot.photos[0] ? undefined : { background: heroGradient }"
      >
        <span v-if="listing.verificationIds.length === 0" class="demo-tag">DEMO</span>
        <button
          v-if="listing.vehicleSnapshot.photos[0]"
          class="hero-img-btn"
          :aria-label="t('listing', 'viewLarge')"
          @click="openLightbox(listing.vehicleSnapshot.photos[0])"
        >
          <img :src="listing.vehicleSnapshot.photos[0]" class="hero-img" alt="" />
        </button>
        <Bike v-else :size="64" color="rgba(255,255,255,0.85)" />
      </div>

      <div class="body">
        <div class="title-row">
          <h2 class="title">
            {{ listing.vehicleSnapshot.manufactureYear }} {{ listing.vehicleSnapshot.brand }}
            {{ listing.vehicleSnapshot.model }}
          </h2>
          <button
            v-if="learnVehicleModelId"
            class="learn-more-btn"
            @click="router.push(`/discussion/vehicle-knowledge/${learnVehicleModelId}`)"
          >
            <Info :size="12" />
            {{ t('listing', 'learnVehicle') }}
          </button>
          <span
            v-if="listing.sellerType === 'dealer'"
            class="dealer-badge"
            :title="t('marketplace', 'dealerBadge')"
          >
            <Store :size="13" />
          </span>
        </div>

        <div class="price-row">
          <span class="price">${{ listing.priceTwd.toLocaleString() }}</span>
        </div>

        <p class="meta-row">
          {{ listing.region }}・{{ listing.district }} ・ {{ t('listing', 'sellerPrefix') }}
          {{ listing.sellerName }}
          <button
            class="favorite-inline-btn"
            :class="{ active: isFavorite }"
            :aria-label="
              isFavorite ? t('marketplace', 'removeFavorite') : t('marketplace', 'addFavorite')
            "
            @click="handleToggleFavorite"
          >
            <Heart :size="15" :fill="isFavorite ? 'currentColor' : 'none'" />
            <span>{{ listing.favoriteCount ?? 0 }}</span>
          </button>
        </p>

        <div class="info-card">
          <h3 class="card-title">{{ t('listing', 'vehicleInfo') }}</h3>
          <div class="info-row">
            <span>{{ t('listing', 'displacement') }}</span>
            <span>{{ listing.vehicleSnapshot.displacementCc }}cc</span>
          </div>
          <div class="info-row">
            <span>{{ t('listing', 'transmission') }}</span>
            <span>{{ listing.vehicleSnapshot.transmission }}</span>
          </div>
          <div class="info-row">
            <span>{{ t('listing', 'color') }}</span>
            <span>{{ listing.vehicleSnapshot.color }}</span>
          </div>
          <div class="info-row">
            <span>{{ t('listing', 'mileage') }}</span>
            <span>{{ listing.vehicleSnapshot.mileage.toLocaleString() }} km</span>
          </div>
          <div class="info-row">
            <span>{{ t('listing', 'modified') }}</span>
            <span class="tag" :class="listing.vehicleSnapshot.modified ? 'warning' : 'success'">
              {{
                listing.vehicleSnapshot.modified
                  ? t('listing', 'modifiedYes')
                  : t('listing', 'modifiedNo')
              }}
            </span>
          </div>
        </div>

        <div class="action-row">
          <button class="chat-btn" :disabled="startingChat" @click="handleChatClick">
            {{ startingChat ? t('listing', 'chatOpening') : t('listing', 'chatButton') }}
          </button>
          <PrimaryButton block :disabled="isOwnListing" @click="handleOpenBooking">
            {{ isOwnListing ? t('listing', 'ownListing') : t('listing', 'bookNow') }}
          </PrimaryButton>
        </div>

        <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

        <template v-if="listing.description">
          <h3 class="section-title">{{ t('listing', 'description') }}</h3>
          <p class="description-text">{{ listing.description }}</p>
        </template>

        <!-- Every listing already requires a passing RiDE78 inspection
             before it can go live. Real listings route to their actual
             verification report; the seeded DEMO listings (no backing
             verification) fall back to the fabricated demo report. -->
        <h3 class="section-title">{{ t('listing', 'reportSection') }}</h3>
        <button class="report-card" @click="router.push(reportPath)">
          <span class="score-badge"><ShieldCheck :size="22" /></span>
          <span class="report-info">
            <span class="report-title">{{ t('listing', 'reportTitle') }}</span>
            <span class="report-subtitle">{{ t('listing', 'reportSubtitle') }}</span>
          </span>
          <ChevronRight :size="18" color="var(--color-text-disabled)" />
        </button>

        <h3 class="section-title">{{ t('listing', 'otherPhotos') }}</h3>
        <div v-if="otherPhotos.length > 0" class="photo-grid">
          <button
            v-for="photo in otherPhotos"
            :key="photo"
            class="photo-real"
            :aria-label="t('listing', 'viewLarge')"
            @click="openLightbox(photo)"
          >
            <img :src="photo" alt="" />
          </button>
        </div>
        <div v-else class="photo-grid">
          <div v-for="index in otherPhotoPlaceholders" :key="index" class="photo-placeholder">
            <Image :size="22" color="var(--color-text-disabled)" />
          </div>
        </div>

        <h3 class="section-title">{{ t('listing', 'sellerInfo') }}</h3>
        <div class="seller-card">
          <div class="seller-avatar">{{ listing.sellerName[0] }}</div>
          <div class="seller-info">
            <span class="seller-name">{{ listing.sellerName }}</span>
            <span class="seller-rating">
              <Star :size="13" color="#e8912c" fill="#e8912c" />
              {{ listing.sellerRating.toFixed(1) }}（{{
                t('home', 'reviewCount', { count: listing.sellerReviewCount })
              }}）
            </span>
          </div>
        </div>
      </div>
    </div>

    <BookingSheet
      :open="bookingSheetOpen"
      :submitting="bookingSubmitting"
      :available-slots="listing ? resolveAvailableSlots(listing) : {}"
      :booked-timestamps="bookedTimestamps"
      @close="bookingSheetOpen = false"
      @submit="handleBookingSubmit"
    />

    <PhotoGalleryLightbox
      v-if="lightboxIndex !== null"
      :photos="galleryPhotos"
      :start-index="lightboxIndex"
      @close="lightboxIndex = null"
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
  margin-top: var(--space-sm);
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-img-btn {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
  background: none;
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

.favorite-inline-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: none;
  background: transparent;
  padding: 2px 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.favorite-inline-btn.active {
  color: var(--color-danger);
}

.learn-more-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: none;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
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

/* `fixed`, not `absolute` — AppHeader.vue is `position: sticky`, which keeps
 * IT pinned on scroll but does nothing for a dropdown anchored to it via
 * `absolute`: that positions against the page's normal document flow, so it
 * scrolls away with the content underneath instead of staying put. `fixed`
 * anchors to the viewport instead, matching the same
 * `calc(var(--header-height) + var(--safe-area-inset-top, env(safe-area-inset-top)))` offset
 * AppHeader.vue's own doc comment already prescribes for anything stacking
 * directly below it. */
.menu {
  position: fixed;
  right: var(--space-md);
  top: calc(var(--header-height) + var(--safe-area-inset-top, env(safe-area-inset-top)));
  z-index: 30;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 140px;
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
  border: none;
  padding: 0;
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
