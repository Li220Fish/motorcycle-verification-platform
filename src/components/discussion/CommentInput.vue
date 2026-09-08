<script setup lang="ts">
import { ref, watch } from 'vue'
import { Send, X } from 'lucide-vue-next'

const props = defineProps<{ sending: boolean; replyToName?: string | null }>()
const emit = defineEmits<{ submit: [string]; cancelReply: [] }>()

const text = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

watch(
  () => props.replyToName,
  (name) => {
    if (name) inputEl.value?.focus()
  },
)

function submit(): void {
  const trimmed = text.value.trim()
  if (!trimmed || props.sending) return
  emit('submit', trimmed)
  text.value = ''
}
</script>

<template>
  <div class="input-wrap">
    <div v-if="replyToName" class="reply-banner">
      <span>回覆 @{{ replyToName }}</span>
      <button aria-label="取消回覆" @click="$emit('cancelReply')"><X :size="14" /></button>
    </div>
    <div class="input-bar">
      <input
        ref="inputEl"
        v-model="text"
        :placeholder="replyToName ? `回覆 @${replyToName}...` : '留下你的想法...'"
        @keydown.enter="submit"
      />
      <button class="send-btn" :disabled="!text.trim() || sending" @click="submit">
        <Send :size="16" color="#fff" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-wrap {
  flex-shrink: 0;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.reply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: var(--color-primary-bg);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
}

.reply-banner button {
  border: none;
  background: none;
  color: var(--color-primary);
  display: flex;
  align-items: center;
}

.input-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}

.input-bar input {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-btn:disabled {
  opacity: 0.45;
}
</style>
