<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ShieldCheck } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VerificationSectionCard from '@/components/verification/VerificationSectionCard.vue'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const verificationStore = useVerificationStore()
const router = useRouter()

const attentionCount = computed(
  () =>
    Object.values(verificationStore.answers).filter((answer) => answer.result === 'attention')
      .length,
)
const unsureCount = computed(
  () =>
    Object.values(verificationStore.answers).filter((answer) => answer.result === 'unsure').length,
)

onMounted(() => {
  verificationStore.loadFlow(props.id)
})
</script>

<template>
  <div>
    <AppHeader title="驗證結果" back />

    <div class="content">
      <div class="result-hero">
        <ShieldCheck :size="64" color="var(--color-success)" />
        <p class="result-title">驗證已完成</p>
        <p class="result-subtitle">已完整記錄車況資料與 Evidence，供買賣雙方參考</p>
      </div>

      <div class="score-card">
        <div class="score-header">
          <span>驗證完成度</span>
          <span class="score-value">{{ verificationStore.overallProgress.percent }}%</span>
        </div>

        <div class="category-list">
          <VerificationSectionCard
            v-for="section in verificationStore.sectionProgress"
            :key="section.sectionId"
            :title="section.title"
            :done="section.done"
            :total="section.total"
          />
        </div>

        <div class="flag-row">
          <span>需要注意</span>
          <span>{{ attentionCount }}</span>
        </div>
        <div class="flag-row">
          <span>不確定</span>
          <span>{{ unsureCount }}</span>
        </div>

        <p class="mock-caption">
          「驗證完成度」代表已完成的檢查項目比例，不代表車況評分；車況細節請見完整報告。
        </p>
      </div>

      <PrimaryButton block @click="router.push(`/verification/${props.id}/report`)">
        查看完整報告
      </PrimaryButton>
      <PrimaryButton
        variant="secondary"
        block
        @click="router.push(`/verification/${props.id}/share`)"
      >
        分享報告
      </PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.result-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  padding: var(--space-lg) 0;
}

.result-title {
  font-size: 22px;
  font-weight: 700;
  margin-top: var(--space-sm);
}

.result-subtitle {
  color: var(--color-text-secondary);
  font-size: 14px;
  max-width: 280px;
}

.score-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 15px;
  font-weight: 700;
}

.score-value {
  font-size: 20px;
  color: var(--color-primary);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.flag-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.mock-caption {
  margin-top: var(--space-sm);
  font-size: 11px;
  color: var(--color-text-disabled);
  text-align: center;
}
</style>
