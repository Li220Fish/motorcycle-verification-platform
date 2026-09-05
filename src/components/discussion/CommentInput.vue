<script setup lang="ts">
import { ref } from 'vue'
import { Send } from 'lucide-vue-next'

const props = defineProps<{ sending: boolean }>()
const emit = defineEmits<{ submit: [string] }>()

const text = ref('')

function submit(): void {
  const trimmed = text.value.trim()
  if (!trimmed || props.sending) return
  emit('submit', trimmed)
  text.value = ''
}
</script>

<template>
  <div class="input-bar">
    <input v-model="text" placeholder="留下你的想法..." @keydown.enter="submit" />
    <button class="send-btn" :disabled="!text.trim() || sending" @click="submit">
      <Send :size="16" color="#fff" />
    </button>
  </div>
</template>

<style scoped>
.input-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
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
