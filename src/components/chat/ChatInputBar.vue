<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Plus, Send } from 'lucide-vue-next'

const props = defineProps<{ sending: boolean }>()
const emit = defineEmits<{ send: [string]; pickImage: [] }>()

const text = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Caps how tall the box grows before it starts scrolling internally instead
// — roughly 6 lines, matches MAX_LINES below (kept as a separate constant
// since it's also used to decide when to add `overflow-y: auto`).
const MAX_HEIGHT_PX = 120

/** Classic auto-grow technique: collapse to 'auto' first so a SHRINKING
 *  edit (e.g. deleting a wrapped line) isn't stuck at its previous taller
 *  height — scrollHeight only ever reports the content's natural height
 *  once the element itself isn't constraining it. */
function resize(): void {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
}

function submit(): void {
  const trimmed = text.value.trim()
  if (!trimmed || props.sending) return
  emit('send', trimmed)
  text.value = ''
  nextTick(() => {
    resize()
    // Mobile WebViews (Android/iOS) can dismiss the IME the instant Enter
    // is handled, even with the newline insertion itself prevented below —
    // explicitly refocusing is what actually stops the keyboard from
    // collapsing after every message, instead of the user having to tap
    // back into the field each time.
    textareaRef.value?.focus()
  })
}

function handleEnter(event: KeyboardEvent): void {
  // Shift+Enter (or any other modifier) still inserts a real newline —
  // only a bare Enter sends, same as the input's previous behavior.
  if (event.shiftKey) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <div class="input-bar">
    <button class="icon-button" aria-label="傳送照片" @click="$emit('pickImage')">
      <Plus :size="20" />
    </button>
    <textarea
      ref="textareaRef"
      v-model="text"
      rows="1"
      placeholder="輸入訊息..."
      enterkeyhint="send"
      @input="resize"
      @keydown.enter="handleEnter"
    />
    <button
      class="send-button"
      aria-label="傳送"
      :disabled="!text.trim() || sending"
      @click="submit"
    >
      <Send :size="16" color="#fff" />
    </button>
  </div>
</template>

<style scoped>
.input-bar {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  padding-bottom: calc(10px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.icon-button {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-bar textarea {
  flex: 1;
  min-width: 0;
  max-height: 120px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 18px;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.4;
  outline: none;
  font-family: inherit;
  color: var(--color-text-primary);
  resize: none;
  overflow-y: auto;
}

.send-button {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--color-primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:disabled {
  opacity: 0.45;
}
</style>
