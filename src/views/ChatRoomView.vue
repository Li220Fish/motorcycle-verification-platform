<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Ban, EyeOff, Flag, MoreVertical } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import ChatBubble from '@/components/chat/ChatBubble.vue'
import ChatDateDivider from '@/components/chat/ChatDateDivider.vue'
import ChatInputBar from '@/components/chat/ChatInputBar.vue'
import { conversationService } from '@/services/chat/conversation.service'
import { homeContentService } from '@/services/firebase/home-content.service'
import { listingService } from '@/services/firebase/listing.service'
import { vehicleService } from '@/services/firebase/vehicle.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import { formatDateDivider } from '@/utils/format-time'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { ListingAppointment } from '@/types/listing-appointment'
import type { Vehicle } from '@/types/vehicle'
import type { Unsubscribe } from 'firebase/firestore'

const props = defineProps<{ conversationId: string }>()

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

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
  return conversation.memberSnapshots[otherId.value]?.displayName ?? '對話'
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

  unsubscribeAppointment = listingService.subscribeAppointments(listingId, (appointments) => {
    const buyerAppointments = appointments
      .filter((appointment) => appointment.buyerId === buyerId)
      .sort((a, b) => b.createdAt - a.createdAt)
    const next = buyerAppointments[0] ?? null
    const previous = relevantAppointment.value

    if (next && previous && next.id === previous.id && next.status !== previous.status) {
      if (isSeller.value && next.status === 'cancelled') {
        showAppointmentToast(`買家已取消 ${formatDateTime(next.scheduledAt)} 的看車預約`)
      } else if (!isSeller.value && next.status === 'approved') {
        showAppointmentToast('賣家已同意您的看車預約')
      } else if (!isSeller.value && next.status === 'declined') {
        showAppointmentToast('賣家已婉拒您的看車預約')
      }
    } else if (isSeller.value && next?.status === 'pending' && next.id !== previous?.id) {
      showAppointmentToast(`${next.buyerName} 送出了新的看車預約`)
    }

    relevantAppointment.value = next
  })
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
      `很抱歉，賣家婉拒了 ${formatDateTime(appointment.scheduledAt)} 的看車預約，歡迎在這裡討論其他時間。`,
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
      `已取消 ${formatDateTime(appointment.scheduledAt)} 的看車預約，歡迎在這裡討論其他時間。`,
    )
    await scrollToBottom()
  } finally {
    decidingAppointment.value = false
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
  actionError.value = '已送出檢舉，我們會儘快處理'
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
  await scrollToBottom()
})

onUnmounted(() => {
  chatStore.closeConversation()
  unsubscribeAppointment?.()
  if (appointmentToastTimer) clearTimeout(appointmentToastTimer)
})
</script>

<template>
  <div class="room">
    <AppHeader :title="otherName" back custom-back @back="handleBack">
      <template #right>
        <button class="icon-button" aria-label="更多" @click="menuOpen = !menuOpen">
          <MoreVertical :size="18" />
        </button>
      </template>
    </AppHeader>

    <div
      v-if="relevantAppointment?.status === 'pending' && isSeller"
      class="appointment-banner pending"
    >
      <p class="ab-text">買家提出看車預約：{{ formatDateTime(relevantAppointment.scheduledAt) }}</p>
      <div class="ab-actions">
        <button class="ab-decline" :disabled="decidingAppointment" @click="handleDecline">
          婉拒
        </button>
        <button class="ab-approve" :disabled="decidingAppointment" @click="handleApprove">
          同意
        </button>
      </div>
    </div>
    <div
      v-else-if="relevantAppointment?.status === 'pending' && !isSeller"
      class="appointment-banner pending"
    >
      <p class="ab-text">
        已送出看車預約：{{ formatDateTime(relevantAppointment.scheduledAt) }}，等待賣家確認。
      </p>
      <div class="ab-actions">
        <button class="ab-decline" :disabled="decidingAppointment" @click="handleCancel">
          取消預約
        </button>
      </div>
    </div>
    <div v-else-if="relevantAppointment?.status === 'approved'" class="appointment-banner approved">
      <p class="ab-text">雙方面交時間為 {{ formatDateTime(relevantAppointment.scheduledAt) }}</p>
      <div v-if="!isSeller" class="ab-actions">
        <button class="ab-decline" :disabled="decidingAppointment" @click="handleCancel">
          取消預約
        </button>
      </div>
    </div>

    <Transition name="toast-fade">
      <p v-if="appointmentToast" class="appointment-toast">{{ appointmentToast }}</p>
    </Transition>

    <div v-if="chatStore.currentConversation" class="tag-row">
      <span class="tag">{{ chatStore.currentConversation.tag }}</span>
    </div>

    <button
      v-if="contextVehicle"
      class="vehicle-context"
      @click="router.push(`/vehicles/${contextVehicle.id}`)"
    >
      <span class="vc-title">{{ contextVehicle.brand }} {{ contextVehicle.model }}</span>
      <span class="vc-link">查看車輛 →</span>
    </button>
    <button
      v-else-if="contextListing"
      class="vehicle-context"
      @click="router.push(`/marketplace/${contextListing.id}`)"
    >
      <span class="vc-title"
        >{{ contextListing.vehicleSnapshot.brand }} {{ contextListing.vehicleSnapshot.model }}</span
      >
      <span class="vc-link">查看刊登 →</span>
    </button>

    <div v-if="menuOpen" class="menu">
      <button @click="handleMute">
        <EyeOff :size="15" />
        {{
          chatStore.currentConversation?.mutedBy.includes(authStore.user?.id ?? '')
            ? '取消靜音'
            : '靜音通知'
        }}
      </button>
      <button @click="handleReport"><Flag :size="15" />檢舉使用者</button>
      <button class="danger" @click="handleBlock"><Ban :size="15" />封鎖使用者</button>
    </div>

    <div ref="messageLog" class="chat-log">
      <p v-if="!chatStore.messagesLoaded" class="loading">載入中...</p>
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
        還沒有訊息，打聲招呼吧！
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
