<script setup lang="ts">
import PrimaryButton from '@/components/common/PrimaryButton.vue'

defineProps<{ completing: boolean }>()
defineEmits<{ finish: []; continueToDisclosure: [] }>()
</script>

<template>
  <div class="engine-choice">
    <h2>核心檢查已完成</h2>
    <p class="hint">
      核心照片、燈光電系、冷車與引擎檢查都已完成。剩下的「其他主動揭露」都是選填項目，可以直接結束驗車，也可以繼續補充。
    </p>
    <PrimaryButton block :disabled="completing" @click="$emit('finish')">
      {{ completing ? '處理中...' : '直接結束，完成驗證' }}
    </PrimaryButton>
    <button class="secondary-btn" :disabled="completing" @click="$emit('continueToDisclosure')">
      填寫補充項目
    </button>
  </div>
</template>

<style scoped>
.engine-choice {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.engine-choice h2 {
  font-size: 18px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.secondary-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.secondary-btn:disabled {
  opacity: 0.5;
}
</style>
