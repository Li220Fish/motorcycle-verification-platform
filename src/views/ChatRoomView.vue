<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Ban, EyeOff, Flag, MoreVertical } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import ChatBubble from '@/components/chat/ChatBubble.vue'
import ChatDateDivider from '@/components/chat/ChatDateDivider.vue'
import ChatInputBar from '@/components/chat/ChatInputBar.vue'
import BookingSheet from '@/components/marketplace/BookingSheet.vue'
import { useI18n } from '@/composables/useI18n'
import { chatService } from '@/services/chat/chat.service'
import { conversationService } from '@/services/chat/conversation.service'
import { homeContentService } from '@/services/firebase/home-content.service'
import { listingService } from '@/services/firebase/listing.service'
import { vehicleService } from '@/services/firebase/vehicle.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import { formatDateDivider } from '@/utils/format-time'
import { resolveAvailableSlots } from '@/data/home/marketplace-mock'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { ListingAppointment } from '@/types/listing-appointment'
import type { Vehicle } from '@/types/vehicle'
import type { Unsubscribe } from 'firebase/firestore'

const props = defineProps<{ conversationId: string }>()

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const { t } = useI18n()

const sending = ref(false)
const menuOpen = ref(false)
const actionError = ref('')
const contextVehicle = ref<Vehicle | null>(null)
const contextListing = ref<MockMarketListing | null>(null)
const messageLog = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const relevantAppointment = ref<ListingAppointment | null>(null)
const decidingAppointment = ref(false)
// In-app notice for a status change the OTHER party caused (Task C3) — never
// shown for a change this session made itself, since handleApprove/
// handleDecline/handleCancel already update relevantAppointment optimistically
// before any snapshot confirming the same value arrives.
const appointmentToast = ref('')
let appointmentToastTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeAppointment: Unsubscribe | null = null

const otherId = computed(() => {
  const conversation = chatStore.currentConversation
  if (!conversation || !authStore.user) return null
  return conversation.memberIds.find((id) => id !== authStore.user!.id) ?? null
})

const otherName = computed(() => {
  const conversation = chatStore.currentConversation
  if (!conversation || !otherId.value) return ''
  return conversation.memberSnapshots[otherId.value]?.displayName ?? t('chatRoom', 'defaultTitle')
})

const groupedMessages = computed(() => {
  const groups: { label: string; items: typeof chatStore.messages }[] = []
  for (const message of chatStore.messages) {
    const label = formatDateDivider(message.createdAt)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.label === label) lastGroup.items.push(message)
    else groups.push({ label, items: [message] })
  }
  return groups
})

const TAG_LABEL_KEY: Record<string, 'filterTrading' | 'filterSystem'> = {
  交易中: 'filterTrading',
  系統: 'filterSystem',
}
const conversationTagLabel = computed(() => {
  const tag = chatStore.currentConversation?.tag
  if (!tag) return ''
  const key = TAG_LABEL_KEY[tag]
  return key ? t('messagesList', key) : tag
})

const otherHasRead = computed(() => {
  const conversation = chatStore.currentConversation
  if (!conversation || !otherId.value) return false
  const lastMineCreatedAt = [...chatStore.messages]
    .reverse()
    .find((m) => m.senderId === authStore.user?.id)?.createdAt
  if (!lastMineCreatedAt) return false
  return (conversation.lastReadAtBy[otherId.value] ?? 0) >= lastMineCreatedAt
})

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messageLog.value) messageLog.value.scrollTop = messageLog.value.scrollHeight
}

function handleBack(): void {
  router.push('/messages')
}

async function loadContextVehicle(): Promise<void> {
  const vehicleId = chatStore.currentConversation?.context?.vehicleId
  contextVehicle.value = vehicleId ? await vehicleService.get(vehicleId).catch(() => null) : null
}

async function loadContextListing(): Promise<void> {
  const listingId = chatStore.currentConversation?.context?.listingId
  contextListing.value = listingId
    ? await homeContentService.getMarketplaceListing(listingId).catch(() => null)
    : null
}

const isSeller = computed(
  () => !!contextListing.value?.sellerId && contextListing.value.sellerId === authStore.user?.id,
)

// 賣家沒設定預約時段時的備援：BookingSheet.vue 原本只會顯示一句提示文字請買家
// 改用「聊聊」詢問——既然買家已經在聊聊視窗裡了，直接在這裡讓他自己挑一個時間
// 送出預約請求，不用再多繞一次。buyer 端尚無有效預約（pending/approved）且賣家
// 尚未開放任何時段時才顯示；流程其餘部分（送出後賣家可在上方 banner 同意/婉拒）
// 與原本已有的 MarketplaceListingView.vue 預約流程完全相同。
const bookingSheetOpen = ref(false)
const bookingSubmitting = ref(false)

const hasActiveAppointment = computed(
  () =>
    relevantAppointment.value?.status === 'pending' ||
    relevantAppointment.value?.status === 'approved',
)

const showBookingPrompt = computed(() => {
  if (!contextListing.value || isSeller.value || hasActiveAppointment.value) return false
  return Object.keys(resolveAvailableSlots(contextListing.value)).length === 0
})

function handleOpenBookingPrompt(): void {
  bookingSheetOpen.value = true
}

async function handleFreeBookingSubmit(payload: { scheduledAt: number }): Promise<void> {
  const listing = contextListing.value
  const sellerId = otherId.value
  if (!listing || !sellerId || !authStore.user) return
  const user = authStore.user
  bookingSubmitting.value = true
  try {
    await listingService.createAppointment({
      listingId: listing.id,
      buyerId: user.id,
      buyerName: user.displayName || user.email || t('chatRoom', 'defaultBuyer'),
      scheduledAt: payload.scheduledAt,
    })
    await chatService.sendSystemNote(
      props.conversationId,
      user.id,
      [sellerId],
      t('chatRoom', 'systemNoteBooking', { time: formatDateTime(payload.scheduledAt) }),
      {
        displayName: user.displayName || user.email || t('chatRoom', 'defaultBuyer'),
        photoUrl: user.photoUrl,
      },
    )
    bookingSheetOpen.value = false
  } catch {
    actionError.value = t('chatRoom', 'bookingFailed')
  } finally {
    bookingSubmitting.value = false
  }
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function showAppointmentToast(message: string): void {
  appointmentToast.value = message
  if (appointmentToastTimer) clearTimeout(appointmentToastTimer)
  appointmentToastTimer = setTimeout(() => {
    appointmentToast.value = ''
  }, 3500)
}

/** The relevant buyer's most recent booking for this conversation's
 * listing — an older, already-resolved appointment shouldn't keep showing a
 * stale banner once a newer one exists. "The relevant buyer" depends on
 * which side of the conversation is looking: the seller cares about the
 * other participant's booking, but a buyer viewing their own conversation
 * with the seller IS that buyer — `otherId` there points at the seller, not
 * at them, so it can't be used for both sides.
 *
 * Live subscription (Task C2), not a one-time fetch — this is exactly what
 * fixes "已操作但另一端過一段時間才更新": both the seller's approve/decline
 * and the buyer's cancel now reach the other party's open chat room
 * immediately. Also drives the in-app toast (Task C3) for changes THIS
 * session didn't itself just make. */
function subscribeAppointment(): void {
  unsubscribeAppointment?.()
  unsubscribeAppointment = null

  const listingId = contextListing.value?.id
  const myUid = authStore.user?.id
  const buyerId = isSeller.value ? otherId.value : myUid
  if (!listingId || !myUid || !buyerId) {
    relevantAppointment.value = null
    return
  }

  unsubscribeAppointment = listingService.subscribeAppointmentsForBuyer(
    listingId,
    buyerId,
    (appointments) => {
      const buyerAppointments = [...appointments].sort((a, b) => b.createdAt - a.createdAt)
      const next = buyerAppointments[0] ?? null
      const previous = relevantAppointment.value

      if (next && previous && next.id === previous.id && next.status !== previous.status) {
        if (isSeller.value && next.status === 'cancelled') {
          showAppointmentToast(
            t('chatRoom', 'toastBuyerCancelled', { time: formatDateTime(next.scheduledAt) }),
          )
        } else if (!isSeller.value && next.status === 'approved') {
          showAppointmentToast(t('chatRoom', 'toastSellerApproved'))
        } else if (!isSeller.value && next.status === 'declined') {
          showAppointmentToast(t('chatRoom', 'toastSellerDeclined'))
        }
      } else if (isSeller.value && next?.status === 'pending' && next.id !== previous?.id) {
        showAppointmentToast(t('chatRoom', 'toastNewBooking', { name: next.buyerName }))
      }

      if (next?.id !== previous?.id) resetDealForm()
      relevantAppointment.value = next
    },
  )
}

async function handleApprove(): Promise<void> {
  const appointment = relevantAppointment.value
  if (!appointment || !isSeller.value) return
  decidingAppointment.value = true
  try {
    await listingService.updateAppointmentStatus(appointment.listingId, appointment.id, 'approved')
    relevantAppointment.value = { ...appointment, status: 'approved' }
  } finally {
    decidingAppointment.value = false
  }
}

async function handleDecline(): Promise<void> {
  const appointment = relevantAppointment.value
  if (!appointment || !isSeller.value) return
  decidingAppointment.value = true
  try {
    await listingService.updateAppointmentStatus(appointment.listingId, appointment.id, 'declined')
    relevantAppointment.value = { ...appointment, status: 'declined' }
    await chatStore.sendText(
      t('chatRoom', 'systemNoteDeclined', { time: formatDateTime(appointment.scheduledAt) }),
    )
    await scrollToBottom()
  } finally {
    decidingAppointment.value = false
  }
}

/** Buyer-only (Task C1) — firestore.rules already allowed pending/approved
 * → cancelled, but no client code ever produced it before this pass. */
async function handleCancel(): Promise<void> {
  const appointment = relevantAppointment.value
  if (!appointment || isSeller.value) return
  if (appointment.status !== 'pending' && appointment.status !== 'approved') return
  decidingAppointment.value = true
  try {
    await listingService.updateAppointmentStatus(appointment.listingId, appointment.id, 'cancelled')
    relevantAppointment.value = { ...appointment, status: 'cancelled' }
    await chatStore.sendText(
      t('chatRoom', 'systemNoteCancelled', { time: formatDateTime(appointment.scheduledAt) }),
    )
    await scrollToBottom()
  } finally {
    decidingAppointment.value = false
  }
}

// "有成交嗎？" — once an 'approved' appointment's scheduledAt has passed,
// swap the banner to ask each side independently (see firestore.rules'
// buyerDealReport/sellerDealReport write rules — each side may only ever
// write their own field, once). `now` ticks every 30s so the swap happens
// live for anyone already sitting in the chat room at the moment the
// meetup time passes, not just on next load.
const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

const meetupPassed = computed(
  () =>
    relevantAppointment.value?.status === 'approved' &&
    relevantAppointment.value.scheduledAt < now.value,
)
const myDealReport = computed(() =>
  isSeller.value
    ? relevantAppointment.value?.sellerDealReport
    : relevantAppointment.value?.buyerDealReport,
)
const otherDealReport = computed(() =>
  isSeller.value
    ? relevantAppointment.value?.buyerDealReport
    : relevantAppointment.value?.sellerDealReport,
)
const showDealPrompt = computed(() => meetupPassed.value && !myDealReport.value)
const bothDealsConfirmed = computed(
  () => !!myDealReport.value?.dealConfirmed && !!otherDealReport.value?.dealConfirmed,
)

const dealAnswer = ref<'yes' | 'no' | null>(null)
const dealPriceInput = ref('')
const submittingDealReport = ref(false)

function resetDealForm(): void {
  dealAnswer.value = null
  dealPriceInput.value = ''
}

function handleSelectNoDeal(): void {
  dealAnswer.value = 'no'
  dealPriceInput.value = ''
}

async function handleSubmitDealReport(): Promise<void> {
  const appointment = relevantAppointment.value
  if (!appointment || !dealAnswer.value) return
  submittingDealReport.value = true
  try {
    const report = {
      dealConfirmed: dealAnswer.value === 'yes',
      priceTwd:
        dealAnswer.value === 'yes' && dealPriceInput.value ? Number(dealPriceInput.value) : null,
    }
    await listingService.submitDealReport(
      appointment.listingId,
      appointment.id,
      isSeller.value ? 'seller' : 'buyer',
      report,
    )
    relevantAppointment.value = {
      ...appointment,
      ...(isSeller.value
        ? { sellerDealReport: { ...report, respondedAt: Date.now() } }
        : { buyerDealReport: { ...report, respondedAt: Date.now() } }),
    }
    resetDealForm()
  } finally {
    submittingDealReport.value = false
  }
}

async function handleSend(text: string): Promise<void> {
  sending.value = true
  try {
    await chatStore.sendText(text)
    await scrollToBottom()
  } catch {
    // sendError surfaced via chatStore.sendError below the input bar
  } finally {
    sending.value = false
  }
}

function handlePickImage(): void {
  fileInput.value?.click()
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  sending.value = true
  try {
    await chatStore.sendImageFile(file)
    await scrollToBottom()
  } catch {
    // surfaced via chatStore.sendError
  } finally {
    sending.value = false
  }
}

async function handleBlock(): Promise<void> {
  menuOpen.value = false
  if (!authStore.user || !otherId.value) return
  await conversationService.blockUser(authStore.user.id, otherId.value)
  router.push('/messages')
}

async function handleReport(): Promise<void> {
  menuOpen.value = false
  if (!authStore.user || !otherId.value) return
  const { discussionService } = await import('@/services/discussion/discussion.service')
  await discussionService.reportContent(authStore.user.id, 'user', otherId.value, '不當言論')
  actionError.value = t('chatRoom', 'reportSent')
}

async function handleMute(): Promise<void> {
  menuOpen.value = false
  const conversation = chatStore.currentConversation
  if (!conversation || !authStore.user) return
  const muted = conversation.mutedBy.includes(authStore.user.id)
  await chatStore.setMuted(conversation.id, !muted)
}

watch(
  () => chatStore.messages.length,
  async () => {
    await scrollToBottom()
    await chatStore.markCurrentConversationRead()
  },
)

watch(() => chatStore.currentConversation?.context?.vehicleId, loadContextVehicle)
watch(() => chatStore.currentConversation?.context?.listingId, loadContextListing)
watch([contextListing, otherId], subscribeAppointment)

onMounted(async () => {
  chatStore.openConversation(props.conversationId)
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 30000)
  await scrollToBottom()
})

onUnmounted(() => {
  chatStore.closeConversation()
  unsubscribeAppointment?.()
  if (nowTimer) clearInterval(nowTimer)
  if (appointmentToastTimer) clearTimeout(appointmentToastTimer)
})
</script>

<template>
  <div class="room">
    <AppHeader :title="otherName" back custom-back @back="handleBack">
      <template #right>
        <button
          class="icon-button"
          :aria-label="t('chatRoom', 'more')"
          @click="menuOpen = !menuOpen"
        >
          <MoreVertical :size="18" />
        </button>
      </template>
    </AppHeader>

    <div
      v-if="relevantAppointment?.status === 'pending' && isSeller"
      class="appointment-banner pending"
    >
      <p class="ab-text">
        {{
          t('chatRoom', 'pendingSellerText', {
            time: formatDateTime(relevantAppointment.scheduledAt),
          })
        }}
      </p>
      <div class="ab-actions">
        <button class="ab-decline" :disabled="decidingAppointment" @click="handleDecline">
          {{ t('chatRoom', 'decline') }}
        </button>
        <button class="ab-approve" :disabled="decidingAppointment" @click="handleApprove">
          {{ t('chatRoom', 'approve') }}
        </button>
      </div>
    </div>
    <div
      v-else-if="relevantAppointment?.status === 'pending' && !isSeller"
      class="appointment-banner pending"
    >
      <p class="ab-text">
        {{
          t('chatRoom', 'pendingBuyerText', {
            time: formatDateTime(relevantAppointment.scheduledAt),
          })
        }}
      </p>
      <div class="ab-actions">
        <button class="ab-decline" :disabled="decidingAppointment" @click="handleCancel">
          {{ t('chatRoom', 'cancelBooking') }}
        </button>
      </div>
    </div>
    <div
      v-else-if="relevantAppointment?.status === 'approved' && !meetupPassed"
      class="appointment-banner approved"
    >
      <p class="ab-text">
        {{
          t('chatRoom', 'approvedText', { time: formatDateTime(relevantAppointment.scheduledAt) })
        }}
      </p>
      <div v-if="!isSeller" class="ab-actions">
        <button class="ab-decline" :disabled="decidingAppointment" @click="handleCancel">
          {{ t('chatRoom', 'cancelBooking') }}
        </button>
      </div>
    </div>
    <div
      v-else-if="relevantAppointment?.status === 'approved' && bothDealsConfirmed"
      class="appointment-banner approved"
    >
      <p class="ab-text">{{ t('chatRoom', 'bothDealsConfirmedText') }}</p>
    </div>
    <div
      v-else-if="relevantAppointment?.status === 'approved' && showDealPrompt"
      class="appointment-banner deal-prompt"
    >
      <p class="ab-text">{{ t('chatRoom', 'dealPromptText') }}</p>
      <div class="deal-answer-row">
        <button
          class="deal-answer-btn"
          :class="{ active: dealAnswer === 'yes' }"
          @click="dealAnswer = 'yes'"
        >
          {{ t('chatRoom', 'dealYes') }}
        </button>
        <button
          class="deal-answer-btn"
          :class="{ active: dealAnswer === 'no' }"
          @click="handleSelectNoDeal"
        >
          {{ t('chatRoom', 'dealNo') }}
        </button>
      </div>
      <input
        v-if="dealAnswer === 'yes'"
        v-model="dealPriceInput"
        type="number"
        min="0"
        :placeholder="t('chatRoom', 'dealPricePlaceholder')"
        class="deal-price-input"
      />
      <button
        class="deal-submit-btn"
        :disabled="!dealAnswer || submittingDealReport"
        @click="handleSubmitDealReport"
      >
        {{ submittingDealReport ? t('chatRoom', 'sending') : t('chatRoom', 'submitReply') }}
      </button>
    </div>
    <div
      v-else-if="relevantAppointment?.status === 'approved' && meetupPassed"
      class="appointment-banner pending"
    >
      <p class="ab-text">{{ t('chatRoom', 'waitingOtherConfirm') }}</p>
    </div>
    <button
      v-else-if="showBookingPrompt"
      class="appointment-banner prompt"
      @click="handleOpenBookingPrompt"
    >
      <p class="ab-text">{{ t('chatRoom', 'bookPrompt') }}</p>
    </button>

    <Transition name="toast-fade">
      <p v-if="appointmentToast" class="appointment-toast">{{ appointmentToast }}</p>
    </Transition>

    <div v-if="chatStore.currentConversation" class="tag-row">
      <span class="tag">{{ conversationTagLabel }}</span>
    </div>

    <button
      v-if="contextVehicle"
      class="vehicle-context"
      @click="router.push(`/vehicles/${contextVehicle.id}`)"
    >
      <span class="vc-title">{{ contextVehicle.brand }} {{ contextVehicle.model }}</span>
      <span class="vc-link">{{ t('chatRoom', 'viewVehicle') }}</span>
    </button>
    <button
      v-else-if="contextListing"
      class="vehicle-context"
      @click="router.push(`/marketplace/${contextListing.id}`)"
    >
      <span class="vc-title"
        >{{ contextListing.vehicleSnapshot.brand }} {{ contextListing.vehicleSnapshot.model }}</span
      >
      <span class="vc-link">{{ t('chatRoom', 'viewListing') }}</span>
    </button>

    <div v-if="menuOpen" class="menu">
      <button @click="handleMute">
        <EyeOff :size="15" />
        {{
          chatStore.currentConversation?.mutedBy.includes(authStore.user?.id ?? '')
            ? t('chatRoom', 'unmute')
            : t('chatRoom', 'mute')
        }}
      </button>
      <button @click="handleReport"><Flag :size="15" />{{ t('chatRoom', 'reportUser') }}</button>
      <button class="danger" @click="handleBlock">
        <Ban :size="15" />{{ t('chatRoom', 'blockUser') }}
      </button>
    </div>

    <div ref="messageLog" class="chat-log">
      <p v-if="!chatStore.messagesLoaded" class="loading">{{ t('chatRoom', 'loading') }}</p>
      <template v-for="group in groupedMessages" :key="group.label">
        <ChatDateDivider :label="group.label" />
        <ChatBubble
          v-for="message in group.items"
          :key="message.id"
          :message="message"
          :mine="message.senderId === authStore.user?.id"
          :read="otherHasRead"
        />
      </template>
      <p v-if="chatStore.messagesLoaded && chatStore.messages.length === 0" class="empty-hint">
        {{ t('chatRoom', 'emptyHint') }}
      </p>
    </div>

    <p v-if="actionError" class="action-error">{{ actionError }}</p>
    <p v-if="chatStore.sendError" class="action-error">{{ chatStore.sendError }}</p>

    <ChatInputBar :sending="sending" @send="handleSend" @pick-image="handlePickImage" />
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-file"
      @change="handleFileChange"
    />

    <BookingSheet
      :open="bookingSheetOpen"
      :submitting="bookingSubmitting"
      :available-slots="{}"
      :booked-timestamps="[]"
      @close="bookingSheetOpen = false"
      @submit="handleFreeBookingSubmit"
    />
  </div>
</template>

<style scoped>
.room {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.icon-button {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.appointment-banner {
  margin: 8px var(--space-md) 0;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.appointment-banner.pending {
  background: var(--color-warning-bg);
}

.appointment-banner.approved {
  background: var(--color-success-bg);
}

.appointment-banner.deal-prompt {
  flex-direction: column;
  align-items: stretch;
  background: var(--color-primary-bg, #e8f1fd);
}

.appointment-banner.deal-prompt .ab-text {
  color: var(--color-primary);
}

.deal-answer-row {
  display: flex;
  gap: 8px;
}

.deal-answer-btn {
  flex: 1;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 12.5px;
  font-weight: 700;
}

.deal-answer-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.deal-price-input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.deal-submit-btn {
  height: 34px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
}

.deal-submit-btn:disabled {
  opacity: 0.5;
}

.appointment-banner.prompt {
  width: 100%;
  border: none;
  background: var(--color-primary-bg, #e8f1fd);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.appointment-banner.prompt .ab-text {
  color: var(--color-primary);
}

.ab-text {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.appointment-banner.pending .ab-text {
  color: var(--color-warning);
}

.appointment-banner.approved .ab-text {
  color: var(--color-success);
}

.ab-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.ab-actions button {
  height: 30px;
  padding: 0 14px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 700;
}

.ab-decline {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.ab-approve {
  border: none;
  background: var(--color-primary);
  color: #fff;
}

.ab-actions button:disabled {
  opacity: 0.6;
}

.appointment-toast {
  margin: 6px var(--space-md) 0;
  padding: 8px var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-text-primary);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}

.tag-row {
  padding: 6px var(--space-md) 0;
}

.tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.vehicle-context {
  margin: 8px var(--space-md) 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.vc-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.vc-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
}

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

.chat-log {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading,
.empty-hint {
  text-align: center;
  color: var(--color-text-disabled);
  font-size: 13px;
  padding: var(--space-lg) 0;
}

.action-error {
  margin: 0 var(--space-md);
  font-size: 12px;
  color: var(--color-danger);
  text-align: center;
}

.hidden-file {
  display: none;
}
</style>
