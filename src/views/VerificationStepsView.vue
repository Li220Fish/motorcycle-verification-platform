<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import RideSafetyGate from '@/components/verification/RideSafetyGate.vue'
import VerificationItem from '@/components/verification/VerificationItem.vue'
import VerificationLayout from '@/components/verification/VerificationLayout.vue'
import VerificationReview from '@/components/verification/VerificationReview.vue'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const verificationStore = useVerificationStore()
const router = useRouter()

const currentIndex = ref(0)
const showReview = ref(false)
const rideSafetyConfirmedIndex = ref(-1)
const completing = ref(false)
const completeError = ref('')

const typeLabel: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業驗證',
}

const pageTitle = computed(
  () => typeLabel[verificationStore.currentVerification?.type ?? ''] ?? '驗證',
)

const currentFlat = computed(() => verificationStore.flatItems[currentIndex.value])

const needsRideSafetyGate = computed(
  () =>
    currentFlat.value?.item.type === 'ride' &&
    rideSafetyConfirmedIndex.value !== currentIndex.value,
)

function handlePrev(): void {
  if (currentIndex.value > 0) currentIndex.value -= 1
}

function handleNext(): void {
  if (currentIndex.value < verificationStore.flatItems.length - 1) {
    currentIndex.value += 1
  } else {
    showReview.value = true
  }
}

function handleJumpTo(itemId: string): void {
  const index = verificationStore.flatItems.findIndex((flat) => flat.item.id === itemId)
  if (index !== -1) currentIndex.value = index
  showReview.value = false
}

async function handleComplete(): Promise<void> {
  completing.value = true
  completeError.value = ''
  try {
    await verificationStore.completeVerification(props.id)
    if (verificationStore.flowKind === 'buyer') {
      router.push(`/verification/${props.id}/comparison`)
    } else {
      router.push(`/verification/${props.id}/result`)
    }
  } catch (error) {
    completeError.value = error instanceof Error ? error.message : '完成驗證失敗'
  } finally {
    completing.value = false
  }
}

watch(
  () => verificationStore.flowLoaded,
  (loaded) => {
    if (loaded) currentIndex.value = verificationStore.resumeIndex
  },
)

onMounted(() => {
  verificationStore.loadFlow(props.id)
})
</script>

<template>
  <VerificationReview
    v-if="showReview"
    :section-progress="verificationStore.sectionProgress"
    :missing-required-items="verificationStore.missingRequiredItems"
    :completing="completing"
    @jump-to="handleJumpTo"
    @complete="handleComplete"
  />
  <VerificationLayout
    v-else-if="currentFlat"
    :title="pageTitle"
    :section-title="`${currentFlat.section.title} · 步驟 ${currentIndex + 1} / ${verificationStore.flatItems.length}`"
    :done="verificationStore.overallProgress.done"
    :total="verificationStore.overallProgress.total"
    :percent="verificationStore.overallProgress.percent"
    :can-go-prev="currentIndex > 0"
    :next-label="currentIndex === verificationStore.flatItems.length - 1 ? '前往檢視' : '下一步'"
    @prev="handlePrev"
    @next="handleNext"
    @review="showReview = true"
  >
    <RideSafetyGate v-if="needsRideSafetyGate" @confirm="rideSafetyConfirmedIndex = currentIndex" />
    <VerificationItem v-else :verification-id="id" :item="currentFlat.item" />
  </VerificationLayout>
  <p v-else class="loading-text">載入中...</p>

  <p v-if="completeError" class="error-text">{{ completeError }}</p>
</template>

<style scoped>
.loading-text {
  padding: var(--space-lg) var(--space-md);
  color: var(--color-text-secondary);
}

.error-text {
  position: fixed;
  bottom: 90px;
  left: var(--space-md);
  right: var(--space-md);
  color: var(--color-danger);
  font-size: 13px;
  text-align: center;
}
</style>
