<script setup lang="ts">
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{ completing: boolean }>()
defineEmits<{ finish: []; continueToDisclosure: [] }>()
</script>

<template>
  <div class="engine-choice">
    <h2>{{ t('engineComplete', 'title') }}</h2>
    <p class="hint">
      {{ t('engineComplete', 'hint') }}
    </p>
    <PrimaryButton block :disabled="completing" @click="$emit('finish')">
      {{ completing ? t('engineComplete', 'processing') : t('engineComplete', 'finish') }}
    </PrimaryButton>
    <button class="secondary-btn" :disabled="completing" @click="$emit('continueToDisclosure')">
      {{ t('engineComplete', 'continue') }}
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
