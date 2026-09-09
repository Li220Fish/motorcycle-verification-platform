<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppearanceCaptureMap from '@/components/verification/AppearanceCaptureMap.vue'
import BasicHealthCheck13 from '@/components/verification/BasicHealthCheck13.vue'
import CorePhotoCaptureFlow from '@/components/verification/CorePhotoCaptureFlow.vue'
import ElectricalLightsCheck from '@/components/verification/ElectricalLightsCheck.vue'
import EngineCompleteChoice from '@/components/verification/EngineCompleteChoice.vue'
import EngineInspectionFlow from '@/components/verification/engine/EngineInspectionFlow.vue'
import ColdTouchCapture from '@/components/verification/environment/ColdTouchCapture.vue'
import RideSafetyGate from '@/components/verification/RideSafetyGate.vue'
import VehicleTypeGate from '@/components/verification/VehicleTypeGate.vue'
import VerificationCategoryNav from '@/components/verification/VerificationCategoryNav.vue'
import VerificationHub from '@/components/verification/VerificationHub.vue'
import VerificationItem from '@/components/verification/VerificationItem.vue'
import VerificationLayout from '@/components/verification/VerificationLayout.vue'
import { getAppearanceGroup } from '@/data/verification/appearance-groups'
// getAppearanceGroupId is only consumed by the Capture Map auto-reopen logic
// in handleNext, which is commented out below — its import is dropped here
// only to avoid an unused-import lint error; re-add `, getAppearanceGroupId`
// to this import when that block is restored.
import {
  ENGINE_SESSION_ITEM_IDS,
  inferTransmissionType,
  transmissionLabelFor,
  type EngineTransmissionType,
} from '@/data/verification/engine-session'
import { SELLER_ELECTRIC_LIGHT_ITEM_IDS } from '@/data/verification/seller-verification'
import { localDraftService } from '@/services/verification/local-draft.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

// Verification v2 — 車身外觀 (steps 5-24) was regrouped into PHASE 1 核心照片
// (seller-phase1-core); the Capture Map hub this constant originally gated
// is already disabled (see appearanceMapOpen below), so this rename only
// keeps the still-live "skip past this section from the category tab" jump
// logic pointed at the right section id.
const APPEARANCE_SECTION_ID = 'seller-phase1-core'
const ENGINE_SESSION_LAST_ITEM_ID = 'ENG-08'

const props = defineProps<{ id: string }>()

const verificationStore = useVerificationStore()
const vehicleStore = useVehicleStore()
const router = useRouter()

const currentIndex = ref(0)
// Guided UI main entry (Task B): every open of /verification/:id lands here
// first — a Section/vehicle-part map — instead of dropping straight into
// item 0 or wherever localDraftService's last-position happened to be. The
// existing resume machinery below still computes currentIndex in the
// background so picking a section (or the section the user was last in)
// lands exactly where they left off, not at that section's start.
const hubOpen = ref(true)
// User-requested confirmation gate: reaching the end of 冷車＋引擎檢查
// (lockedOrder Phase 3) used to auto-advance straight into Phase 4's first
// item, forcing the user to click through every optional 主動揭露 item (or
// tap 部位總覽) just to reach 完成驗證. Phase 4 is entirely Optional, so
// there's nothing left blocking completion at this exact point — asking
// explicitly ("直接結束" vs "填寫補充項目") beats silently continuing.
const showEngineCompleteChoice = ref(false)
// 基本13項健檢 — a standalone checklist opened from the Hub, kept separate
// from hubOpen/currentIndex since it isn't part of the flat item flow (see
// BasicHealthCheck13.vue's own header comment for why).
const basicHealthCheckOpen = ref(false)
// Chain/sprocket detection bug fix: hasExposedChainSprocket (both the
// client's Phase 1 item-visibility check and the Trusted Backend's Core
// Vision v2 gating — see vehicle-context.service.ts) reads Vehicle.
// transmission. The ONLY previously-mandatory place that ever set it was
// EngineInspectionFlow.vue's own picker, deep in Phase 3 (冷車＋引擎檢查) —
// well AFTER Phase 1's core photos (including APR-transmission-chain) are
// captured and analyzeCoreVisionV2 has already fired fire-and-forget.
// Confirmed live: transmission is still unknown at that point for nearly
// every real usage order, so the backend's "unknown -> assume no chain"
// default (opposite of the client's "unknown -> assume chain, keep it
// required" default) meant chain_sprocket_condition was almost always
// silently marked not_applicable, even for a real chain-drive bike with a
// real photo uploaded. Asking here — before Phase 1 is ever reachable —
// guarantees transmission is known before any evidence triggers analysis.
const vehicleTypeConfirmed = ref(false)
const needsVehicleTypeGate = computed(() => {
  const vehicle = vehicleStore.currentVehicle
  const verification = verificationStore.currentVerification
  if (
    vehicleTypeConfirmed.value ||
    !vehicle ||
    !verification ||
    vehicle.id !== verification.vehicleId
  ) {
    return false
  }
  return inferTransmissionType(vehicle.transmission) === null
})

function handlePickVehicleType(type: EngineTransmissionType): void {
  vehicleTypeConfirmed.value = true
  const vehicleId = verificationStore.currentVerification?.vehicleId
  if (!vehicleId) return
  vehicleStore
    .updateVehicle(vehicleId, { transmission: transmissionLabelFor(type) })
    .catch((error) => console.error('[VehicleTypeGate] updateVehicle failed:', error))
}

const rideSafetyConfirmedIndex = ref(-1)
const completing = ref(false)
const completeError = ref('')
// Capture Map hub for 車身外觀 (P1 §10 of the UX report) — a UI-only mode
// flag; the 20 underlying APR-* items and their linear order are untouched.
// Disabled 2026-09 per user request — they want to shoot straight through
// the 20 photos without returning to the hub after each one. The map UX
// itself is still considered good, so nothing here was deleted: every place
// that would flip this flag to `true`, plus the "← 返回拍攝地圖" button, is
// commented out below instead. Uncomment those spots to bring it back.
const appearanceMapOpen = ref(false)

const typeLabel: Record<string, string> = {
  seller: '車輛驗證',
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

const isAppearanceSection = computed(() => currentFlat.value?.section.id === APPEARANCE_SECTION_ID)

// The 7 required core photos (車輛左側/右側/車尾/儀表板/前避震/引擎底部/傳動
// 鏈條) render as ONE consolidated live-camera session (CorePhotoCaptureFlow.
// vue), same "swap in at this level" pattern as the lights/engine groups
// above — landing on ANY of the 7 (free-jump, resume, or linear Next) shows
// the same screen, camera never closes between shots.
const isCorePhotoGroup = computed(
  () =>
    !!currentFlat.value &&
    currentFlat.value.item.type === 'photo' &&
    currentFlat.value.item.required,
)
const corePhotoItemIds = computed(() =>
  verificationStore.flatItems
    .filter((flat) => flat.item.type === 'photo' && flat.item.required)
    .map((flat) => flat.item.id),
)

// ENG-03..08 (啟動馬達聲音..油門轉動運轉穩定度) render as one consolidated
// 3-session flow (EngineInspectionFlow.vue) instead of 6 separate one-item
// screens — see MotoVerify_Engine_Audio_IMU_UI_Agent_Implementation.md.
// ENG-01/02 (引擎觸感/冷車檢查) are untouched, still plain VerificationItem.
const isEngineSessionGroup = computed(
  () => !!currentFlat.value && ENGINE_SESSION_ITEM_IDS.includes(currentFlat.value.item.id),
)
const engineSessionRecording = ref(false)

// Step 39 (Cold-State spec) — single-item custom capture screen, same
// "swap in at this level" pattern as the lights/engine groups above, just
// without any multi-item grouping logic since it's exactly one
// VerificationItem.
const isColdTouchSession = computed(() => currentFlat.value?.item.id === 'ENG-02')
const coldTouchRecording = ref(false)

// P0: within a lockedOrder section (引擎狀況) "下一步" must be a real gate,
// not just hidden step-chips — see isItemAdvanceReady in the store. The
// Engine session group is a single bundle: ready only once ALL 6 underlying
// items are answered, not just whichever one `currentIndex` happens to sit
// on (that index barely moves while the consolidated flow is active).
const nextDisabled = computed(() => {
  if (isEngineSessionGroup.value) {
    return !ENGINE_SESSION_ITEM_IDS.every((itemId) => {
      const flat = verificationStore.flatItems.find((candidate) => candidate.item.id === itemId)
      return !!flat && verificationStore.isItemAdvanceReady(flat)
    })
  }
  return !!currentFlat.value && !verificationStore.isItemAdvanceReady(currentFlat.value)
})
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
  if (appearanceMapOpen.value) {
    // Map has no single "current item" — stepping back leaves the category
    // entirely, same as if the user had never opened the map.
    appearanceMapOpen.value = false
    currentIndex.value -= 1
    return
  }
  if (isLightsGroup.value) {
    // Step back over the WHOLE consolidated lights screen at once, not one
    // light at a time — it renders as a single page.
    const firstLightIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === SELLER_ELECTRIC_LIGHT_ITEM_IDS[0],
    )
    currentIndex.value = Math.max(firstLightIndex - 1, 0)
    return
  }
  if (isEngineSessionGroup.value) {
    // Same idea — leave the whole 3-session flow as one unit, landing back
    // on ENG-02 (冷車檢查), not mid-flow.
    const firstEngineIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === ENGINE_SESSION_ITEM_IDS[0],
    )
    currentIndex.value = Math.max(firstEngineIndex - 1, 0)
    return
  }
  if (isCorePhotoGroup.value) {
    // Same idea — leave the whole consolidated camera session as one unit.
    // Not reachable via the (hidden, Teleported-over) footer button in
    // practice — CorePhotoCaptureFlow.vue's own back arrow opens the Hub
    // directly — kept for consistency with the other groups above.
    const firstCoreIndex = verificationStore.flatItems.findIndex((flat) =>
      corePhotoItemIds.value.includes(flat.item.id),
    )
    currentIndex.value = Math.max(firstCoreIndex - 1, 0)
    return
  }
  currentIndex.value -= 1
}

function handleNext(): void {
  if (nextDisabled.value) return
  if (appearanceMapOpen.value) {
    // Skip the whole category from the hub screen — same idea as Prev above.
    const items = verificationStore.flatItems
    let lastAppearanceIndex = -1
    items.forEach((flat, idx) => {
      if (flat.section.id === APPEARANCE_SECTION_ID) lastAppearanceIndex = idx
    })
    if (lastAppearanceIndex !== -1 && lastAppearanceIndex < items.length - 1) {
      currentIndex.value = lastAppearanceIndex + 1
      appearanceMapOpen.value = false
    } else {
      hubOpen.value = true
    }
    return
  }
  if (isLightsGroup.value) {
    const lastLightIndex = verificationStore.flatItems.findIndex(
      (flat) =>
        flat.item.id === SELLER_ELECTRIC_LIGHT_ITEM_IDS[SELLER_ELECTRIC_LIGHT_ITEM_IDS.length - 1],
    )
    if (lastLightIndex < verificationStore.flatItems.length - 1) {
      currentIndex.value = lastLightIndex + 1
    } else {
      hubOpen.value = true
    }
    return
  }
  if (isEngineSessionGroup.value) {
    // nextDisabled above already guarantees all 6 items are done before this
    // can be reached. Everything from here to the end of the flow (Phase 4,
    // 其他主動揭露) is Optional — nothing left can block 完成驗證 — so ask
    // instead of silently marching into it (see showEngineCompleteChoice).
    const lastEngineIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === ENGINE_SESSION_LAST_ITEM_ID,
    )
    if (lastEngineIndex !== -1 && lastEngineIndex < verificationStore.flatItems.length - 1) {
      showEngineCompleteChoice.value = true
    } else {
      hubOpen.value = true
    }
    return
  }
  if (isCorePhotoGroup.value) {
    // CorePhotoCaptureFlow.vue only ever emits this once all 7 items have a
    // photo (its own 完成 button) — jump past the WHOLE group at once,
    // mirroring isLightsGroup/isEngineSessionGroup above.
    let lastCoreIndex = -1
    verificationStore.flatItems.forEach((flat, idx) => {
      if (corePhotoItemIds.value.includes(flat.item.id)) lastCoreIndex = idx
    })
    if (lastCoreIndex !== -1 && lastCoreIndex < verificationStore.flatItems.length - 1) {
      currentIndex.value = lastCoreIndex + 1
    } else {
      hubOpen.value = true
    }
    return
  }
  if (currentIndex.value < verificationStore.flatItems.length - 1) {
    const nextIndex = verificationStore.resolveNextIndex(currentIndex.value)
    // Capture Map hub disabled (see appearanceMapOpen's declaration above) —
    // this used to re-open the hub when crossing INTO 車身外觀, or from one
    // Capture Map group into a different one. Uncomment to restore it
    // (including the `nextFlat` lookup below).
    // const nextFlat = verificationStore.flatItems[nextIndex]
    // if (nextFlat.section.id === APPEARANCE_SECTION_ID) {
    //   const currentGroupId = currentFlat.value
    //     ? getAppearanceGroupId(currentFlat.value.item.id)
    //     : null
    //   const nextGroupId = getAppearanceGroupId(nextFlat.item.id)
    //   if (currentGroupId !== nextGroupId) appearanceMapOpen.value = true
    // }
    currentIndex.value = nextIndex
  } else {
    hubOpen.value = true
  }
}

function handleJumpTo(itemId: string): void {
  const items = verificationStore.flatItems
  const index = items.findIndex((flat) => flat.item.id === itemId)
  if (index === -1) return

  // Defense in depth: even if a caller (e.g. Review's "jump to missing item")
  // targets an item past an unmet lockedOrder gate WITHIN A LOCKED SECTION,
  // land on the first blocking step instead of skipping ahead of it.
  //
  // Scoped to `items[index].section.lockedOrder` (not a bare flow-wide
  // check) since Verification v2 — this used to be safe as a flow-wide scan
  // because the one lockedOrder section (引擎狀況) was always the LAST
  // section, so nothing ever came after it to accidentally trip this guard.
  // v2 added PHASE 4 (其他主動揭露, freely orderable, spec: "可全部略過")
  // AFTER PHASE 3 (冷車＋引擎檢查, still lockedOrder) — without this section
  // scoping, tapping into Phase 4 from the Hub while Phase 3 is incomplete
  // incorrectly redirected back into Phase 3, live-reproduced on a real
  // device testing this migration. Jumping within/into a lockedOrder section
  // still correctly gates on its own incomplete steps; jumping to an
  // unrelated free section never should.
  const targetItem = items[index]
  const firstBlockedIndex = items.findIndex(
    (flat) => flat.section.lockedOrder && !verificationStore.isItemAdvanceReady(flat),
  )
  currentIndex.value =
    targetItem.section.lockedOrder && firstBlockedIndex !== -1 && index > firstBlockedIndex
      ? firstBlockedIndex
      : index
  hubOpen.value = false
  // Jumping to one specific item is always a drill-in, whether it came from
  // the Capture Map or from the Hub's missing-item list.
  appearanceMapOpen.value = false
}

function handleSelectAppearanceGroup(groupId: string): void {
  const group = getAppearanceGroup(groupId)
  if (!group) return
  const firstUnanswered = group.itemIds.find((itemId) => !verificationStore.answers[itemId])
  handleJumpTo(firstUnanswered ?? group.itemIds[0])
}

// Bookmark navigation — both flows have real, distinct categories now that
// Buyer shares Seller's first 4 sections outright (see
// buyer-verification.ts) instead of one flat 14-section B0..B13 list.
// Jumping to a category resumes at its first unanswered item, same as the
// overall resumeIndex behaviour.
const showCategoryNav = computed(() => true)
const answeredIds = computed(() => Object.keys(verificationStore.answers))

function handleJumpToSection(sectionId: string): void {
  const section = verificationStore.sections.find((candidate) => candidate.id === sectionId)
  if (!section || section.items.length === 0) return
  const firstUnanswered = section.items.find((it) => !verificationStore.answers[it.id])
  const targetId = (firstUnanswered ?? section.items[0]).id

  // Capture Map hub disabled (see appearanceMapOpen's declaration above) —
  // this used to always open the hub when jumping to 車身外觀 via the
  // category tab, instead of a specific photo item directly. Uncomment to
  // restore it.
  // if (sectionId === APPEARANCE_SECTION_ID) {
  //   const index = verificationStore.flatItems.findIndex((flat) => flat.item.id === targetId)
  //   if (index !== -1) currentIndex.value = index
  //   showReview.value = false
  //   appearanceMapOpen.value = true
  //   return
  // }
  handleJumpTo(targetId)
}

function handleEnterSectionFromHub(sectionId: string): void {
  handleJumpToSection(sectionId)
  hubOpen.value = false
}

function handleOpenBasicHealthCheck(): void {
  hubOpen.value = false
  basicHealthCheckOpen.value = true
}

function handleCloseBasicHealthCheck(): void {
  basicHealthCheckOpen.value = false
  hubOpen.value = true
}

const ANALYSIS_ROUTE_KEYS = [
  'coreVision',
  'dashboardOcr',
  'coldCheck',
  'engineSensorSession',
] as const

function handleRetryAnalysis(key: string): void {
  const match = ANALYSIS_ROUTE_KEYS.find((candidate) => candidate === key)
  if (match) void verificationStore.retryAnalysis(match)
}

function handleEngineChoiceContinue(): void {
  const lastEngineIndex = verificationStore.flatItems.findIndex(
    (flat) => flat.item.id === ENGINE_SESSION_LAST_ITEM_ID,
  )
  currentIndex.value = lastEngineIndex + 1
  showEngineCompleteChoice.value = false
}

function handleEngineChoiceFinish(): void {
  void handleComplete()
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

// Captured once, before loadFlow even starts, so it reflects ONLY what a
// PRIOR visit left behind — never something this mount's own hub-dismissal
// might write moments later (see the save-watcher's !hubOpen guard below).
const initialLastItemId = localDraftService.loadLastPosition(props.id)

// Resume exactly where the user left off, not "first unanswered item" —
// those are different concepts. A real prior position also bypasses the
// Guided Hub entirely (reload/relaunch mid-verification shouldn't force an
// extra tap back through the section map) — only a genuinely fresh, never-
// visited verification shows the Hub first.
watch(
  () => verificationStore.flowLoaded,
  (loaded) => {
    if (!loaded) return
    const lastIndex = initialLastItemId
      ? verificationStore.flatItems.findIndex((flat) => flat.item.id === initialLastItemId)
      : -1
    if (lastIndex !== -1) {
      currentIndex.value = lastIndex
      hubOpen.value = false
    }
    // Resuming always lands directly on the exact last-visited item — even
    // inside 車身外觀 — never re-interrupts with the Capture Map hub.
    appearanceMapOpen.value = false
  },
)

watch(currentFlat, (flat) => {
  // Guarded on !hubOpen (as well as flowLoaded) so the Hub being on-screen
  // never itself writes a position — only real post-hub navigation does.
  if (flat && verificationStore.flowLoaded && !hubOpen.value)
    localDraftService.saveLastPosition(props.id, flat.item.id)
})

onMounted(() => {
  verificationStore.loadFlow(props.id)
})
</script>

<template>
  <VehicleTypeGate v-if="needsVehicleTypeGate" @pick="handlePickVehicleType" />
  <VerificationHub
    v-else-if="hubOpen"
    :sections="verificationStore.sections"
    :section-progress="verificationStore.sectionProgress"
    :loading="!verificationStore.flowLoaded"
    :missing-required-items="verificationStore.missingRequiredItems"
    :pending-required-uploads="verificationStore.pendingRequiredUploads"
    :failed-required-uploads="verificationStore.failedRequiredUploads"
    :pending-required-analysis="verificationStore.pendingRequiredAnalysis"
    :failed-required-analysis="verificationStore.failedRequiredAnalysis"
    :completing="completing"
    @select-section="handleEnterSectionFromHub"
    @complete="handleComplete"
    @retry-analysis="handleRetryAnalysis"
    @open-basic-health-check="handleOpenBasicHealthCheck"
  />
  <BasicHealthCheck13
    v-else-if="basicHealthCheckOpen"
    :has-chain="vehicleStore.currentVehicle?.hasChain"
    :model-id="vehicleStore.currentVehicle?.modelId"
    @back="handleCloseBasicHealthCheck"
  />
  <EngineCompleteChoice
    v-else-if="showEngineCompleteChoice"
    :completing="completing"
    @finish="handleEngineChoiceFinish"
    @continue-to-disclosure="handleEngineChoiceContinue"
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
    :hide-footer="
      (isEngineSessionGroup && engineSessionRecording) ||
      (isColdTouchSession && coldTouchRecording) ||
      isCorePhotoGroup
    "
    @back="handleBack"
    @prev="handlePrev"
    @next="handleNext"
    @review="hubOpen = true"
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
    <AppearanceCaptureMap
      v-else-if="isAppearanceSection && appearanceMapOpen"
      @select-group="handleSelectAppearanceGroup"
    />
    <ElectricalLightsCheck
      v-else-if="isLightsGroup"
      :verification-id="id"
      :items="lightsGroupItems"
    />
    <ColdTouchCapture
      v-else-if="isColdTouchSession"
      :verification-id="id"
      @recording-active="coldTouchRecording = $event"
    />
    <EngineInspectionFlow
      v-else-if="isEngineSessionGroup"
      :verification-id="id"
      @advance="handleNext"
      @recording-active="engineSessionRecording = $event"
    />
    <CorePhotoCaptureFlow
      v-else-if="isCorePhotoGroup"
      :verification-id="id"
      :initial-item-id="currentFlat.item.id"
      @advance="handleNext"
      @back="hubOpen = true"
    />
    <template v-else>
      <!-- Capture Map hub disabled (see appearanceMapOpen's declaration in
           the script above) — this button used to reopen it. Uncomment to
           restore it.
      <button v-if="isAppearanceSection" class="back-to-map-btn" @click="appearanceMapOpen = true">
        ← 返回拍攝地圖
      </button>
      -->
      <VerificationItem :verification-id="id" :item="currentFlat.item" @advance="handleNext" />
    </template>
  </VerificationLayout>
  <p v-else class="loading-text">載入中...</p>

  <p v-if="completeError" class="error-text">{{ completeError }}</p>
</template>

<style scoped>
.hub-return-row {
  display: flex;
  justify-content: flex-end;
  padding: 4px var(--space-md) 0;
  background: var(--color-surface);
}

.hub-return-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 0;
}

.back-to-map-btn {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
  padding: 0 0 4px;
  margin-bottom: 4px;
}

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
