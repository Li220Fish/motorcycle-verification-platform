<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import ElectricalLightsCheck from '@/components/verification/ElectricalLightsCheck.vue'
import RideSafetyGate from '@/components/verification/RideSafetyGate.vue'
import VerificationCategoryNav from '@/components/verification/VerificationCategoryNav.vue'
import VerificationItem from '@/components/verification/VerificationItem.vue'
import VerificationLayout from '@/components/verification/VerificationLayout.vue'
import VerificationReview from '@/components/verification/VerificationReview.vue'
import { SELLER_ELECTRIC_LIGHT_ITEM_IDS } from '@/data/verification/seller-verification'
import { localDraftService } from '@/services/verification/local-draft.service'
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

// Per-category progress only (e.g. "車輛檢查 5/19") while inside the flow —
// the confusing dual "步驟 X/73 + 0%" global display was P1 §24; the overall
// 73-item count belongs only on Verification Home / Final Review, not on
// every single item screen.
const currentSectionProgress = computed(() => {
  const section = currentFlat.value?.section
  if (!section) return { done: 0, total: 0, percent: 0 }
  const found = verificationStore.sectionProgress.find((entry) => entry.sectionId === section.id)
  const done = found?.done ?? 0
  const total = found?.total ?? section.items.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
})

// 9 near-identical "does it light up" pages (ELEC-01..09) collapse into one
// quick-check screen — see ElectricalLightsCheck.vue / P1 Electrical Quick
// Check in the UX report. Landing on ANY of the 9 (free-jump, resume, or
// linear Next) shows the same consolidated screen.
const isLightsGroup = computed(
  () => !!currentFlat.value && SELLER_ELECTRIC_LIGHT_ITEM_IDS.includes(currentFlat.value.item.id),
)
const lightsGroupItems = computed(() =>
  verificationStore.flatItems
    .filter((flat) => SELLER_ELECTRIC_LIGHT_ITEM_IDS.includes(flat.item.id))
    .map((flat) => flat.item),
)

const needsRideSafetyGate = computed(
  () =>
    currentFlat.value?.item.type === 'ride' &&
    rideSafetyConfirmedIndex.value !== currentIndex.value,
)

// P0: within a lockedOrder section (引擎狀況) "下一步" must be a real gate,
// not just hidden step-chips — see isItemAdvanceReady in the store.
const nextDisabled = computed(
  () => !!currentFlat.value && !verificationStore.isItemAdvanceReady(currentFlat.value),
)
const nextDisabledHint = computed(
  () => currentFlat.value?.item.lockedHint ?? '請先完成本項目所需的照片／錄影／錄音，才能繼續。',
)

// Deterministic exit target instead of raw browser history — history.back()
// from inside a checklist item could land anywhere depending on how the user
// arrived (deep link, category jump, resumed session), which reads as random.
// Leaving the flow always goes to this verification's own Vehicle Detail page.
function handleBack(): void {
  const vehicleId = verificationStore.currentVerification?.vehicleId
  router.push(vehicleId ? `/vehicles/${vehicleId}` : '/vehicles')
}

function handlePrev(): void {
  if (currentIndex.value === 0) return
  if (isLightsGroup.value) {
    // Step back over the WHOLE consolidated lights screen at once, not one
    // light at a time — it renders as a single page.
    const firstLightIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === SELLER_ELECTRIC_LIGHT_ITEM_IDS[0],
    )
    currentIndex.value = Math.max(firstLightIndex - 1, 0)
    return
  }
  currentIndex.value -= 1
}

function handleNext(): void {
  if (nextDisabled.value) return
  if (isLightsGroup.value) {
    const lastLightIndex = verificationStore.flatItems.findIndex(
      (flat) =>
        flat.item.id === SELLER_ELECTRIC_LIGHT_ITEM_IDS[SELLER_ELECTRIC_LIGHT_ITEM_IDS.length - 1],
    )
    if (lastLightIndex < verificationStore.flatItems.length - 1) {
      currentIndex.value = lastLightIndex + 1
    } else {
      showReview.value = true
    }
    return
  }
  if (currentIndex.value < verificationStore.flatItems.length - 1) {
    currentIndex.value += 1
  } else {
    showReview.value = true
  }
}

function handleJumpTo(itemId: string): void {
  const items = verificationStore.flatItems
  const index = items.findIndex((flat) => flat.item.id === itemId)
  if (index === -1) return

  // Defense in depth: even if a caller (e.g. Review's "jump to missing item")
  // targets an item past an unmet lockedOrder gate, land on the first
  // blocking step instead of skipping ahead of it.
  const firstBlockedIndex = items.findIndex(
    (flat) => flat.section.lockedOrder && !verificationStore.isItemAdvanceReady(flat),
  )
  currentIndex.value =
    firstBlockedIndex !== -1 && index > firstBlockedIndex ? firstBlockedIndex : index
  showReview.value = false
}

// Bookmark navigation — only offered on the Seller flow for now (see
// verification-steps route/SELLER_VERIFICATION_SECTIONS). Jumping to a
// category resumes at its first unanswered item, same as the overall
// resumeIndex behaviour.
const showCategoryNav = computed(() => verificationStore.flowKind === 'seller')
const answeredIds = computed(() => Object.keys(verificationStore.answers))

function handleJumpToSection(sectionId: string): void {
  const section = verificationStore.sections.find((candidate) => candidate.id === sectionId)
  if (!section || section.items.length === 0) return
  const firstUnanswered = section.items.find((it) => !verificationStore.answers[it.id])
  handleJumpTo((firstUnanswered ?? section.items[0]).id)
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

// Resume exactly where the user left off, not "first unanswered item" —
// those are different concepts. Only fall back to first-unanswered when
// there's no recorded last position at all (e.g. first-ever visit).
watch(
  () => verificationStore.flowLoaded,
  (loaded) => {
    if (!loaded) return
    const lastItemId = localDraftService.loadLastPosition(props.id)
    const lastIndex = lastItemId
      ? verificationStore.flatItems.findIndex((flat) => flat.item.id === lastItemId)
      : -1
    currentIndex.value = lastIndex !== -1 ? lastIndex : verificationStore.resumeIndex
  },
)

watch(currentFlat, (flat) => {
  // Guard on flowLoaded: before it flips true, `currentFlat` transiently
  // resolves to flatItems[0] (currentIndex still at its ref(0) default)
  // while loadFlow is still fetching — saving that would clobber the real
  // last-visited position with "PREP-01" before the resume watcher above
  // even gets a chance to apply it.
  if (flat && verificationStore.flowLoaded)
    localDraftService.saveLastPosition(props.id, flat.item.id)
})

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
    :section-title="
      isLightsGroup ? `${currentFlat.section.title} · 燈具快速檢查` : currentFlat.section.title
    "
    :done="currentSectionProgress.done"
    :total="currentSectionProgress.total"
    :percent="currentSectionProgress.percent"
    :can-go-prev="currentIndex > 0"
    :next-label="currentIndex === verificationStore.flatItems.length - 1 ? '前往檢視' : '下一步'"
    :next-disabled="nextDisabled"
    :next-disabled-hint="nextDisabledHint"
    @back="handleBack"
    @prev="handlePrev"
    @next="handleNext"
    @review="showReview = true"
  >
    <template v-if="showCategoryNav" #nav>
      <VerificationCategoryNav
        :sections="verificationStore.sections"
        :current-item-id="currentFlat.item.id"
        :answered-ids="answeredIds"
        @select-section="handleJumpToSection"
        @select-item="handleJumpTo"
      />
    </template>

    <RideSafetyGate v-if="needsRideSafetyGate" @confirm="rideSafetyConfirmedIndex = currentIndex" />
    <ElectricalLightsCheck
      v-else-if="isLightsGroup"
      :verification-id="id"
      :items="lightsGroupItems"
    />
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
