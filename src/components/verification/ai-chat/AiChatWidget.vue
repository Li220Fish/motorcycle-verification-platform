<script setup lang="ts">
/**
 * 買家複驗的 AI 詢問浮動小視窗 — a floating button that opens a small chat
 * panel: type a question and/or attach a photo, the answer comes from Gemini
 * (askAiAssistant Cloud Function, no added prompt). Conversation lives only
 * in this session (ai-chat.store.ts; VerificationStepsView.vue resets it on
 * leave). Capture screens can open it with a photo already attached via
 * aiChatStore.askAboutEvidencePhoto() even where the button isn't shown.
 *
 * The 「問 AI」 button itself: only where the parent asks for it (`showFab` —
 * the 12-point check), draggable anywhere on screen (position remembered on
 * this device), and fades to half-transparent after a few idle seconds.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Camera, MessageCircle, Send, Trash2, X } from 'lucide-vue-next'

import { useI18n } from '@/composables/useI18n'
import { useAiChatStore } from '@/stores/ai-chat.store'

const props = defineProps<{
  /** Hide button AND panel entirely (cold/hot engine sections). */
  hidden?: boolean
  /** Show the floating 「問 AI」 button (the 12-point check only). */
  showFab?: boolean
}>()

// ---------- draggable, idle-fading button ----------
const FAB_POS_KEY = 'motoverify:aiFabPos'
const IDLE_MS = 3000
const DRAG_THRESHOLD_PX = 6
const fabEl = ref<HTMLElement | null>(null)
/** Distance from the viewport's right/bottom edges, in px. */
const fabPos = ref<{ right: number; bottom: number }>(loadFabPos())
const idle = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null
let drag: { x: number; y: number; right: number; bottom: number; moved: boolean } | null = null

function loadFabPos(): { right: number; bottom: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(FAB_POS_KEY) ?? 'null')
    if (typeof saved?.right === 'number' && typeof saved?.bottom === 'number') return saved
  } catch {
    // ignore — fall back to the default corner
  }
  return { right: 16, bottom: 96 }
}

function wake(): void {
  idle.value = false
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => (idle.value = true), IDLE_MS)
}

function clampPos(right: number, bottom: number): { right: number; bottom: number } {
  const w = fabEl.value?.offsetWidth ?? 90
  const h = fabEl.value?.offsetHeight ?? 44
  const maxRight = Math.max(8, window.innerWidth - w - 8)
  const maxBottom = Math.max(8, window.innerHeight - h - 8)
  return {
    right: Math.min(Math.max(8, right), maxRight),
    bottom: Math.min(Math.max(8, bottom), maxBottom),
  }
}

function onFabPointerDown(event: PointerEvent): void {
  wake()
  drag = { x: event.clientX, y: event.clientY, ...fabPos.value, moved: false }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onFabPointerMove(event: PointerEvent): void {
  if (!drag) return
  const dx = event.clientX - drag.x
  const dy = event.clientY - drag.y
  if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
  drag.moved = true
  fabPos.value = clampPos(drag.right - dx, drag.bottom - dy)
}

function onFabPointerUp(): void {
  if (!drag) return
  const wasDrag = drag.moved
  drag = null
  wake()
  if (wasDrag) {
    try {
      localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPos.value))
    } catch {
      // per-device convenience only
    }
  } else {
    chat.open = true
  }
}

const fabStyle = computed(() => ({
  right: `${fabPos.value.right}px`,
  bottom: `calc(${fabPos.value.bottom}px + env(safe-area-inset-bottom, 0px))`,
}))

onMounted(wake)
onBeforeUnmount(() => {
  if (idleTimer) clearTimeout(idleTimer)
})
watch(
  () => props.showFab,
  (show) => show && wake(),
)

const { t } = useI18n()
const chat = useAiChatStore()
const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function scrollToBottom(): void {
  void nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}
watch(() => [chat.messages.length, chat.sending, chat.open], scrollToBottom)

async function onPickFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await chat.attachImage(file).catch((error) => console.error(error))
}

async function submit(): Promise<void> {
  const text = draft.value
  draft.value = ''
  await chat.send(text)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submit()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-show="!hidden" class="ai-chat-root">
      <button
        v-if="!chat.open && showFab"
        ref="fabEl"
        type="button"
        class="ai-fab"
        :class="{ idle }"
        :style="fabStyle"
        :aria-label="t('aiChat', 'fab')"
        @pointerdown="onFabPointerDown"
        @pointermove="onFabPointerMove"
        @pointerup="onFabPointerUp"
        @pointercancel="onFabPointerUp"
        @keydown.enter.prevent="chat.open = true"
      >
        <MessageCircle :size="20" />
        <span>{{ t('aiChat', 'fab') }}</span>
      </button>

      <section
        v-else-if="chat.open"
        class="ai-panel"
        role="dialog"
        :aria-label="t('aiChat', 'title')"
      >
        <header class="ai-head">
          <strong>{{ t('aiChat', 'title') }}</strong>
          <div class="ai-head-actions">
            <button
              v-if="chat.messages.length > 0"
              type="button"
              class="icon-btn"
              :aria-label="t('aiChat', 'clear')"
              :disabled="chat.sending"
              @click="chat.messages = []"
            >
              <Trash2 :size="16" />
            </button>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('aiChat', 'close')"
              @click="chat.open = false"
            >
              <X :size="18" />
            </button>
          </div>
        </header>

        <div ref="listEl" class="ai-list">
          <p v-if="chat.messages.length === 0" class="ai-intro">{{ t('aiChat', 'intro') }}</p>
          <div
            v-for="message in chat.messages"
            :key="message.id"
            class="ai-msg"
            :class="[message.role, { error: message.error }]"
          >
            <img v-if="message.imageUrl" :src="message.imageUrl" class="ai-msg-img" alt="" />
            <p v-if="message.text">{{ message.text }}</p>
          </div>
          <div v-if="chat.sending" class="ai-msg model thinking">{{ t('aiChat', 'thinking') }}</div>
        </div>

        <div v-if="chat.pendingImage || chat.preparingImage" class="ai-pending">
          <template v-if="chat.pendingImage">
            <img :src="chat.pendingImage.previewUrl" alt="" />
            <span>{{ t('aiChat', 'photoReady') }}</span>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('aiChat', 'removePhoto')"
              @click="chat.clearImage()"
            >
              <X :size="16" />
            </button>
          </template>
          <span v-else>{{ t('aiChat', 'preparing') }}</span>
        </div>

        <form class="ai-input" @submit.prevent="submit">
          <button
            type="button"
            class="icon-btn"
            :aria-label="t('aiChat', 'attach')"
            :disabled="chat.sending || chat.preparingImage"
            @click="fileInput?.click()"
          >
            <Camera :size="20" />
          </button>
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            accept="image/*"
            capture="environment"
            @change="onPickFile"
          />
          <textarea
            v-model="draft"
            rows="1"
            maxlength="2000"
            :placeholder="t('aiChat', 'placeholder')"
            @keydown="onKeydown"
          />
          <button
            type="submit"
            class="send-btn"
            :aria-label="t('aiChat', 'send')"
            :disabled="chat.sending || chat.preparingImage || (!draft.trim() && !chat.pendingImage)"
          >
            <Send :size="18" />
          </button>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-fab {
  position: fixed;
  right: 16px;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  z-index: 350;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font: 600 14px var(--font-family);
  box-shadow:
    var(--shadow-card),
    0 4px 14px rgba(0, 0, 0, 0.18);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: opacity 0.4s;
}

/* Not in use for a few seconds → half-transparent, so it doesn't cover the
   checklist photo; any touch brings it back to full opacity. */
.ai-fab.idle {
  opacity: 0.45;
}

.ai-panel {
  position: fixed;
  right: 12px;
  left: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 350;
  max-width: 420px;
  margin-left: auto;
  height: min(70vh, 560px);
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.ai-head-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.4;
}

.ai-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-intro {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.ai-msg {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
}

.ai-msg p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-msg.user {
  align-self: flex-end;
  background: var(--color-primary);
  color: #fff;
}

.ai-msg.model {
  align-self: flex-start;
  background: var(--color-background);
}

.ai-msg.error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.ai-msg.thinking {
  color: var(--color-text-secondary);
}

.ai-msg-img {
  display: block;
  max-width: 100%;
  max-height: 180px;
  border-radius: 10px;
  margin-bottom: 6px;
}

.ai-pending {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.ai-pending img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
}

.ai-pending span {
  flex: 1;
}

.ai-input {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid var(--color-border);
}

.file-input {
  display: none;
}

.ai-input textarea {
  flex: 1;
  min-height: 38px;
  max-height: 110px;
  resize: none;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-text-primary);
  font: 14px/1.4 var(--font-family);
}

.send-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
