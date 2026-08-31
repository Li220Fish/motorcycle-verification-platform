<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Ban, EyeOff, Flag, MoreVertical } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import ChatAttachmentSheet from '@/components/chat/ChatAttachmentSheet.vue'
import ChatBubble from '@/components/chat/ChatBubble.vue'
import ChatDateDivider from '@/components/chat/ChatDateDivider.vue'
import ChatInputBar from '@/components/chat/ChatInputBar.vue'
import { conversationService } from '@/services/chat/conversation.service'
import { homeContentService } from '@/services/firebase/home-content.service'
import { vehicleService } from '@/services/firebase/vehicle.service'
import { verificationService } from '@/services/firebase/verification.service'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'
import { formatDateDivider } from '@/utils/format-time'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { Vehicle } from '@/types/vehicle'

const props = defineProps<{ conversationId: string }>()

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const sending = ref(false)
const attachmentSheetOpen = ref(false)
const menuOpen = ref(false)
const actionError = ref('')
const contextVehicle = ref<Vehicle | null>(null)
const contextListing = ref<MockMarketListing | null>(null)
const messageLog = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

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
  attachmentSheetOpen.value = false
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

async function handleShareVehicle(): Promise<void> {
  attachmentSheetOpen.value = false
  const vehicle = contextVehicle.value
  if (!vehicle) {
    actionError.value = '此對話沒有關聯車輛可分享'
    return
  }
  await chatStore.sendVehicle(vehicle.id, `${vehicle.brand} ${vehicle.model}`)
  await scrollToBottom()
}

async function handleShareReport(): Promise<void> {
  attachmentSheetOpen.value = false
  const vehicleId = chatStore.currentConversation?.context?.vehicleId
  if (!vehicleId || !authStore.user) {
    actionError.value = '此對話沒有關聯車輛，無法分享驗證報告'
    return
  }
  const verifications = await verificationService.listByVehicle(vehicleId).catch(() => [])
  const report = verifications.find((v) => v.type === 'seller' && v.status === 'completed')
  if (!report) {
    actionError.value = '尚未有已完成的驗證報告可分享'
    return
  }
  await chatStore.sendVerificationReport(report.id)
  await scrollToBottom()
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

onMounted(async () => {
  chatStore.openConversation(props.conversationId)
  await scrollToBottom()
})

onUnmounted(() => {
  chatStore.closeConversation()
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
      <span class="vc-title">{{ contextListing.brand }} {{ contextListing.model }}</span>
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

    <ChatInputBar
      :sending="sending"
      @send="handleSend"
      @open-attachments="attachmentSheetOpen = true"
    />
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-file"
      @change="handleFileChange"
    />

    <ChatAttachmentSheet
      v-if="attachmentSheetOpen"
      @close="attachmentSheetOpen = false"
      @pick-image="handlePickImage"
      @share-vehicle="handleShareVehicle"
      @share-report="handleShareReport"
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
