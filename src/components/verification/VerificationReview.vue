<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VerificationSectionCard from './VerificationSectionCard.vue'
import type { MissingRequiredItem, SectionProgress } from '@/stores/verification.store'

defineProps<{
  sectionProgress: SectionProgress[]
  missingRequiredItems: MissingRequiredItem[]
  completing: boolean
}>()

defineEmits<{ jumpTo: [string]; complete: [] }>()
</script>

<template>
  <div class="review">
    <h2>驗證總覽</h2>

    <div class="section-list">
      <VerificationSectionCard
        v-for="section in sectionProgress"
        :key="section.sectionId"
        :title="section.title"
        :done="section.done"
        :total="section.total"
      />
    </div>

    <template v-if="missingRequiredItems.length > 0">
      <p class="missing-title">尚未完成：</p>
      <ul class="missing-list">
        <li v-for="missing in missingRequiredItems" :key="missing.itemId">
          <button @click="$emit('jumpTo', missing.itemId)">
            {{ missing.sectionTitle }} — {{ missing.title }}
          </button>
        </li>
      </ul>
      <p class="missing-count">尚有 {{ missingRequiredItems.length }} 項必填未完成</p>
      <PrimaryButton
        variant="secondary"
        block
        @click="$emit('jumpTo', missingRequiredItems[0].itemId)"
      >
        返回補充
      </PrimaryButton>
    </template>
    <template v-else>
      <p class="all-done">所有必填項目已完成。</p>
      <PrimaryButton block :disabled="completing" @click="$emit('complete')">
        <Loader2 v-if="completing" :size="16" class="spin" />
        {{ completing ? '處理中...' : '完成驗證' }}
      </PrimaryButton>
    </template>
  </div>
</template>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.review h2 {
  font-size: 20px;
  font-weight: 700;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.missing-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-warning);
}

.missing-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.missing-list button {
  width: 100%;
  text-align: left;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-warning-bg);
  border: none;
  border-radius: var(--radius-sm);
  color: #9a6b0a;
  font-size: 13px;
}

.missing-count {
  font-size: 13px;
  color: var(--color-danger);
  font-weight: 600;
}

.all-done {
  color: var(--color-success);
  font-weight: 600;
}

.spin {
  animation: verification-review-spin 0.8s linear infinite;
}

@keyframes verification-review-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
