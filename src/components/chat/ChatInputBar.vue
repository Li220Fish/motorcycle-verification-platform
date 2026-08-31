<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Send } from 'lucide-vue-next'

const props = defineProps<{ sending: boolean }>()
const emit = defineEmits<{ send: [string]; openAttachments: [] }>()

const text = ref('')

function submit(): void {
  const trimmed = text.value.trim()
  if (!trimmed || props.sending) return
  emit('send', trimmed)
  text.value = ''
}
</script>

<template>
  <div class="input-bar">
    <button class="icon-button" aria-label="附加內容" @click="$emit('openAttachments')">
      <Plus :size="20" />
    </button>
    <input v-model="text" placeholder="輸入訊息..." @keydown.enter="submit" />
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
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
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

.input-bar input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13.5px;
  outline: none;
  font-family: inherit;
  color: var(--color-text-primary);
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
