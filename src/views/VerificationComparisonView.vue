<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import ComparisonSummary from '@/components/verification/ComparisonSummary.vue'
import { findItemById } from '@/data/verification'
import { comparisonService } from '@/services/verification/comparison.service'
import { verificationService } from '@/services/firebase/verification.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { ComparisonItem } from '@/services/verification/comparison.service'
import type { TransactionDecision } from '@/types/verification'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps<{ id: string }>()

const verificationStore = useVerificationStore()
const router = useRouter()

const comparisonItems = ref<ComparisonItem[]>([])
const attentionItems = ref<string[]>([])
const unsureItems = ref<string[]>([])
const incompleteCount = ref(0)
const loading = ref(true)

async function load(): Promise<void> {
  loading.value = true
  await verificationStore.loadFlow(props.id)
  const verification = verificationStore.currentVerification
  if (!verification) {
    loading.value = false
    return
  }

  if (verification.relatedVerificationId) {
    comparisonItems.value = await comparisonService.buildComparison(
      verification.relatedVerificationId,
      props.id,
    )
  }

  const buyerAnswers = await verificationService.listAnswers(props.id)
  attentionItems.value = buyerAnswers
    .filter((answer) => answer.result === 'attention')
    .map((answer) => findItemById('buyer', answer.itemId)?.title ?? answer.itemId)
  unsureItems.value = buyerAnswers
    .filter((answer) => answer.result === 'unsure')
    .map((answer) => findItemById('buyer', answer.itemId)?.title ?? answer.itemId)
  incompleteCount.value = verificationStore.flatItems.length - buyerAnswers.length

  loading.value = false
}

async function handleDecide(decision: TransactionDecision): Promise<void> {
  await verificationStore.saveTransactionDecision(props.id, decision)
}

const hasSellerLink = computed(() =>
  Boolean(verificationStore.currentVerification?.relatedVerificationId),
)

onMounted(load)
</script>

<template>
  <div>
    <AppHeader :title="t('comparison', 'pageTitle')" back />

    <div class="content">
      <p v-if="loading">{{ t('ui', 'loading') }}</p>
      <EmptyState
        v-else-if="!hasSellerLink"
        :title="t('comparison', 'noLinkTitle')"
        :description="t('comparison', 'noLinkDesc')"
      />
      <ComparisonSummary
        v-if="!loading"
        :comparison-items="comparisonItems"
        :attention-items="attentionItems"
        :unsure-items="unsureItems"
        :incomplete-count="incompleteCount"
        :decision="verificationStore.currentVerification?.transactionDecision"
        @decide="handleDecide"
      />
      <PrimaryButton
        v-if="!loading"
        block
        variant="secondary"
        @click="router.push(`/verification/${props.id}/report`)"
      >
        {{ t('ui', 'viewFullReport') }}
      </PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
