<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import AppearanceCaptureMap from '@/components/verification/AppearanceCaptureMap.vue'
import BasicHealthCheck13 from '@/components/verification/BasicHealthCheck13.vue'
import BuyerDisclosureCheck from '@/components/verification/BuyerDisclosureCheck.vue'
import BuyerYearGate from '@/components/verification/BuyerYearGate.vue'
import CorePhotoCaptureFlow from '@/components/verification/CorePhotoCaptureFlow.vue'
import ElectricalLightsCheck from '@/components/verification/ElectricalLightsCheck.vue'
import EngineCompleteChoice from '@/components/verification/EngineCompleteChoice.vue'
import EngineInspectionFlow from '@/components/verification/engine/EngineInspectionFlow.vue'
import ColdTouchCapture from '@/components/verification/environment/ColdTouchCapture.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import RideSafetyGate from '@/components/verification/RideSafetyGate.vue'
import RideTransition from '@/components/verification/RideTransition.vue'
import VehicleTypeGate from '@/components/verification/VehicleTypeGate.vue'
import VerificationCategoryNav from '@/components/verification/VerificationCategoryNav.vue'
import VerificationHub from '@/components/verification/VerificationHub.vue'
import VerificationItem from '@/components/verification/VerificationItem.vue'
import VerificationLayout from '@/components/verification/VerificationLayout.vue'
import VerificationTour from '@/components/verification/VerificationTour.vue'
import { getAppearanceGroup } from '@/data/verification/appearance-groups'
// getAppearanceGroupId is only consumed by the Capture Map auto-reopen logic
// in handleNext, which is commented out below — its import is dropped here
// only to avoid an unused-import lint error; re-add `, getAppearanceGroupId`
// to this import when that block is restored.
import { BASIC_HEALTH_CHECK_ITEM_IDS } from '@/data/verification/basic-health-check-items'
import {
  ENGINE_SESSION_ITEM_IDS,
  HOT_ENGINE_SESSION_ITEM_IDS,
  inferTransmissionType,
  LOCKED_ENGINE_SECTION_ID,
  LOCKED_HOT_ENGINE_SECTION_ID,
  transmissionLabelFor,
  type EngineTransmissionType,
} from '@/data/verification/engine-session'
import { SELLER_ELECTRIC_LIGHT_ITEM_IDS } from '@/data/verification/seller-verification'
import { verificationService } from '@/services/firebase/verification.service'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'
import { localDraftService } from '@/services/verification/local-draft.service'
import { tourService } from '@/services/verification/tour.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

// Verification v2 — 車身外觀 (steps 5-24) was regrouped into PHASE 1 核心照片
// (seller-phase1-core); the Capture Map hub this constant originally gated
// is already disabled (see appearanceMapOpen below), so this rename only
// keeps the still-live "skip past this section from the category tab" jump
// logic pointed at the right section id.
const APPEARANCE_SECTION_ID = 'seller-phase1-core'
// 其他主動揭露 — for a buyer flow, every one of this section's 9 items is
// `required:false` and so gets filtered out of flatItems/sections entirely
// by isItemVisible (verification.store.ts), which otherwise left buyers
// with no way to ever reach this section at all (Hub tap silently no-oped,
// linear Next skipped straight past it into 上路). BuyerDisclosureCheck.vue
// is shown as a standalone interstitial instead — see showBuyerDisclosure
// below — bypassing flatItems/sections for its own (dynamically-built)
// content entirely.
const DISCLOSURE_SECTION_ID = 'seller-phase4-disclosure'
const ENGINE_SESSION_LAST_ITEM_ID = 'ENG-08'
const HOT_ENGINE_SESSION_LAST_ITEM_ID = 'HOT-07'
const LOCKED_SECTION_IDS = [LOCKED_ENGINE_SECTION_ID, LOCKED_HOT_ENGINE_SECTION_ID]

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
// 買家流程的「其他主動揭露」替代畫面 (BuyerDisclosureCheck.vue) — see
// DISCLOSURE_SECTION_ID's own comment above for why this can't just be a
// normal flatItems stop the way every other section is.
const showBuyerDisclosure = ref(false)
// Chain/sprocket detection bug fix: hasExposedChainSprocket (both the
// client's Phase 1 item-visibility check and the Trusted Backend's Core
// Vision v2 gating — see vehicle-context.service.ts) reads Vehicle.
// transmission. The ONLY previously-mandatory place that ever set it was
// EngineInspectionFlow.vue's own picker, deep in Phase 3 (冷車＋引擎檢查) —
// well AFTER Phase 1's core photos (including APR-transmission-chain) are
// captured and the engine-bottom Core Vision group has already fired
// fire-and-forget (analyzeCoreVisionEngineBottom — see core-vision-split
// .service.ts).
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

// 買家複驗專屬：年份詢問關卡 (requirement 3b) + 通病自動帶入 (3c). See
// BuyerYearGate.vue's own doc comment for why this is a one-time gate, not
// a normal checklist item. `vehicleSnapshot` present means this verification
// came from an appointment (see VerificationView.vue's handleStartFromAppointment)
// — a buyer can never read vehicles/{id} for that path, so the live vehicle
// doc is never consulted; its ABSENCE means the 幫這次驗車取個名字 fallback
// path, where the buyer owns the vehicle outright and vehicleStore
// .currentVehicle works normally.
const yearGateDismissed = ref(false)
const needsYearGate = computed(() => {
  if (yearGateDismissed.value) return false
  if (verificationStore.flowKind !== 'buyer') return false
  const verification = verificationStore.currentVerification
  if (!verification) return false
  if (verification.vehicleSnapshot) return verification.vehicleSnapshot.manufactureYear == null
  return vehicleStore.currentVehicle?.manufactureYear == null
})

const knownIssuesChecked = ref(false)
async function ensureBuyerKnownIssuesLoaded(): Promise<void> {
  const verification = verificationStore.currentVerification
  if (!verification || verificationStore.flowKind !== 'buyer') return
  if (knownIssuesChecked.value) return
  knownIssuesChecked.value = true
  if (verification.buyerKnownIssuesSnapshot) return
  const modelId = verification.vehicleSnapshot?.modelId
  if (!modelId) return
  try {
    const profile = await vehicleModelService.getProfile(modelId)
    if (profile) {
      await verificationService.saveBuyerKnownIssuesSnapshot(verification.id, profile.knownIssues)
    }
  } catch (error) {
    console.error('[BuyerYearGate] failed to load known issues:', error)
  }
}

async function handleConfirmYear(year: number): Promise<void> {
  const verification = verificationStore.currentVerification
  yearGateDismissed.value = true
  if (verification) {
    try {
      if (verification.vehicleSnapshot) {
        await verificationService.saveBuyerVehicleYear(verification.id, year)
      } else {
        await vehicleStore.updateVehicle(verification.vehicleId, { manufactureYear: year })
      }
    } catch (error) {
      console.error('[BuyerYearGate] failed to save year:', error)
    }
  }
  await ensureBuyerKnownIssuesLoaded()
}

// Already-known-year buyer verifications never show the gate at all, so
// this is the other place ensureBuyerKnownIssuesLoaded() needs to fire —
// once flowLoaded resolves and the gate turns out not to be needed.
watch(
  () => verificationStore.flowLoaded,
  (loaded) => {
    if (loaded && !needsYearGate.value) void ensureBuyerKnownIssuesLoaded()
  },
)

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
// Once the safety checklist is confirmed, RIDE-01 shows RideTransition.vue
// (the GIF "go ride it" screen) instead of falling through to
// VerificationItem.vue's generic normal/attention/unsure selector — RIDE-01
// isn't a judged checklist item, it's a "go do this, then come back"
// procedural step.
const needsRideTransition = computed(
  () =>
    currentFlat.value?.item.type === 'ride' &&
    rideSafetyConfirmedIndex.value === currentIndex.value,
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

// 基本12項健檢 (BASIC-*, see basic-health-check-items.ts) renders as ONE
// consolidated tap-on-photo screen, same "swap in at this level" pattern as
// the other groups above — it used to be its own standalone mode opened
// from the Hub (a separate card, outside the flat item/section system);
// now it's a real section/tab like everything else, landing on ANY of its
// items (free-jump, resume, or linear Next) shows the same screen.
const isBasicHealthCheckGroup = computed(
  () => !!currentFlat.value && BASIC_HEALTH_CHECK_ITEM_IDS.includes(currentFlat.value.item.id),
)

// ENG-03..08 (啟動馬達聲音..油門轉動運轉穩定度) render as one consolidated
// 3-session flow (EngineInspectionFlow.vue) instead of 6 separate one-item
// screens — see MotoVerify_Engine_Audio_IMU_UI_Agent_Implementation.md.
// ENG-01/02 (引擎觸感/冷車檢查) are untouched, still plain VerificationItem.
const isEngineSessionGroup = computed(
  () => !!currentFlat.value && ENGINE_SESSION_ITEM_IDS.includes(currentFlat.value.item.id),
)
const engineSessionRecording = ref(false)

// HOT-04..07 (熱車怠速運轉聲..熱車轉動油門震動資料) — same "one consolidated
// recording session" treatment as isEngineSessionGroup above, via the same
// EngineInspectionFlow.vue component in `mode="hot"`. HOT-01..03 (引擎底部/
// 汽缸頭/排氣端 leak checks) are untouched, still plain VerificationItem.
const isHotEngineSessionGroup = computed(
  () => !!currentFlat.value && HOT_ENGINE_SESSION_ITEM_IDS.includes(currentFlat.value.item.id),
)
const hotEngineSessionRecording = ref(false)

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
// on (that index barely moves while the consolidated flow is active). Same
// idea for the hot session group's 4 items.
const nextDisabled = computed(() => {
  if (isEngineSessionGroup.value) {
    return !ENGINE_SESSION_ITEM_IDS.every((itemId) => {
      const flat = verificationStore.flatItems.find((candidate) => candidate.item.id === itemId)
      return !!flat && verificationStore.isItemAdvanceReady(flat)
    })
  }
  if (isHotEngineSessionGroup.value) {
    return !HOT_ENGINE_SESSION_ITEM_IDS.every((itemId) => {
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
// Not wrapped in guardLeaveEngineSection below — this is a real router
// navigation, so the onBeforeRouteLeave guard further down already catches
// it (same as hardware back / browser back), and double-guarding would pop
// the warning dialog twice.
function handleBack(): void {
  const vehicleId = verificationStore.currentVerification?.vehicleId
  router.push(vehicleId ? `/vehicles/${vehicleId}` : '/vehicles')
}

// --- 冷車＋引擎檢查 (LOCKED_ENGINE_SECTION_ID) leave-mid-way guard ---------
// Product decision: this whole section is all-or-nothing — once ANY of its
// items has an answer, abandoning it before every item is done wipes the
// section back to a blank slate (see verificationStore.resetLockedEngine
// Section) instead of silently letting the user resume later. Two separate
// mechanisms feed the SAME warning dialog:
//   1. guardLeaveEngineSection() — for in-app "leaves" that are plain local
//      state changes, not a router navigation (the review icon opening the
//      Hub, switching to a different category tab). A pending plain
//      callback runs once confirmed.
//   2. The onBeforeRouteLeave guard below — for anything that IS a router
//      navigation: the header back button (handleBack, above), the Android
//      hardware back button / edge-swipe-back gesture (both funnel through
//      router.back() — see main.ts), and a plain browser back/forward. Vue
//      Router awaits a Promise return from this guard, so it's held pending
//      until the dialog resolves it (true = let the navigation through,
//      false = stay put).
// A THIRD path — the app being killed/crashing, or the tab being closed
// outright — can't be intercepted by either mechanism; that's instead
// caught defensively on the NEXT visit (see the "already in progress on
// load" check further below), which is the only way to guarantee this rule
// holds regardless of how the interruption happened.
// Generalized 2026-09 to cover TWO locked sections (LOCKED_SECTION_IDS: the
// cold 冷車＋引擎檢查 pass every flow has, plus a buyer flow's own 熱車檢查) —
// "which one" is just whichever section the current item happens to sit in;
// a user is only ever inside one locked section at a time, so this stays a
// single pair of computeds rather than one per section.
function sectionInProgress(sectionId: string): boolean {
  const progress = verificationStore.sectionProgress.find((entry) => entry.sectionId === sectionId)
  return !!progress && progress.done > 0 && progress.done < progress.total
}
const currentLockedSectionId = computed<string | null>(() => {
  const id = currentFlat.value?.section.id
  return id && LOCKED_SECTION_IDS.includes(id) ? id : null
})
const isInsideLockedEngineSection = computed(() => currentLockedSectionId.value !== null)
const lockedEngineSectionInProgress = computed(
  () => !!currentLockedSectionId.value && sectionInProgress(currentLockedSectionId.value),
)
const showLeaveEngineWarning = ref(false)
const resettingEngineSection = ref(false)
let pendingLeaveAction: (() => void) | null = null
let pendingRouteLeaveResolve: ((allow: boolean) => void) | null = null

function guardLeaveEngineSection(proceed: () => void): void {
  if (isInsideLockedEngineSection.value && lockedEngineSectionInProgress.value) {
    pendingLeaveAction = proceed
    showLeaveEngineWarning.value = true
    return
  }
  proceed()
}

function dismissLeaveEngineWarning(): void {
  showLeaveEngineWarning.value = false
  pendingLeaveAction = null
  // Cancelling mid-navigation (hardware back / browser back) must actively
  // tell the router "no" — just hiding the dialog leaves that guard's
  // Promise unresolved forever, silently stuck.
  pendingRouteLeaveResolve?.(false)
  pendingRouteLeaveResolve = null
}

async function confirmLeaveEngineSection(): Promise<void> {
  const proceed = pendingLeaveAction
  const allowRoute = pendingRouteLeaveResolve
  const sectionId = currentLockedSectionId.value ?? LOCKED_ENGINE_SECTION_ID
  pendingLeaveAction = null
  pendingRouteLeaveResolve = null
  resettingEngineSection.value = true
  try {
    await verificationStore.resetLockedEngineSection(sectionId)
  } catch (error) {
    console.error('[VerificationStepsView] resetLockedEngineSection failed:', error)
  } finally {
    resettingEngineSection.value = false
  }
  showLeaveEngineWarning.value = false
  proceed?.()
  allowRoute?.(true)
}

// Router-level leave: covers the header back button, Android hardware back /
// edge-swipe gesture, and plain browser back/forward — anything that goes
// through Vue Router rather than a plain ref change (see the comment above).
onBeforeRouteLeave(() => {
  if (!isInsideLockedEngineSection.value || !lockedEngineSectionInProgress.value) return true
  return new Promise<boolean>((resolve) => {
    pendingRouteLeaveResolve = resolve
    showLeaveEngineWarning.value = true
  })
})

function handleReview(): void {
  guardLeaveEngineSection(() => {
    hubOpen.value = true
  })
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
  if (isHotEngineSessionGroup.value) {
    // Same idea — leave the whole 2-session 熱車檢查 flow as one unit,
    // landing back on HOT-03 (排氣端), not mid-flow.
    const firstHotIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === HOT_ENGINE_SESSION_ITEM_IDS[0],
    )
    currentIndex.value = Math.max(firstHotIndex - 1, 0)
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
  if (isBasicHealthCheckGroup.value) {
    // Same idea — leave the whole tap-on-photo checklist as one unit. Not
    // reachable via the (hidden, Teleported-over) footer button in practice
    // — BasicHealthCheck13.vue's own back arrow opens the Hub directly —
    // kept for consistency with the other groups above.
    const firstBasicIndex = verificationStore.flatItems.findIndex((flat) =>
      BASIC_HEALTH_CHECK_ITEM_IDS.includes(flat.item.id),
    )
    currentIndex.value = Math.max(firstBasicIndex - 1, 0)
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
    // can be reached. For a SELLER flow, everything from here to the end
    // (Phase 4, 其他主動揭露) is Optional — nothing left can block 完成驗證 —
    // so ask instead of silently marching into it (see
    // showEngineCompleteChoice). A BUYER flow shows BuyerDisclosureCheck.vue
    // as its own interstitial instead (Phase 4's actual items are hidden
    // for buyers — see verification.store.ts's isItemVisible — this is a
    // buyer-only reconstruction of that same section, not the same screen),
    // then continues into 上路/熱車檢查 once the buyer taps 下一步 there.
    const lastEngineIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === ENGINE_SESSION_LAST_ITEM_ID,
    )
    if (verificationStore.flowKind === 'buyer') {
      showBuyerDisclosure.value = true
    } else if (
      lastEngineIndex === -1 ||
      lastEngineIndex >= verificationStore.flatItems.length - 1
    ) {
      hubOpen.value = true
    } else {
      showEngineCompleteChoice.value = true
    }
    return
  }
  if (isHotEngineSessionGroup.value) {
    // nextDisabled above already guarantees all 4 items are done — 熱車檢查
    // is the last section in the buyer flow, so there's nothing to jump
    // past into; either straight to the next flat item (shouldn't normally
    // exist) or back to the Hub.
    const lastHotIndex = verificationStore.flatItems.findIndex(
      (flat) => flat.item.id === HOT_ENGINE_SESSION_LAST_ITEM_ID,
    )
    if (lastHotIndex !== -1 && lastHotIndex < verificationStore.flatItems.length - 1) {
      currentIndex.value = lastHotIndex + 1
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
  if (isBasicHealthCheckGroup.value) {
    // BasicHealthCheck13.vue only ever emits this once every required item
    // is tapped (its own 完成 button, gated the same way) — jump past the
    // WHOLE group at once, mirroring isCorePhotoGroup above.
    let lastBasicIndex = -1
    verificationStore.flatItems.forEach((flat, idx) => {
      if (BASIC_HEALTH_CHECK_ITEM_IDS.includes(flat.item.id)) lastBasicIndex = idx
    })
    if (lastBasicIndex !== -1 && lastBasicIndex < verificationStore.flatItems.length - 1) {
      currentIndex.value = lastBasicIndex + 1
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
  // 其他主動揭露 (buyer flow only) — its section.items is always empty for
  // buyers (isItemVisible filters out every one of its required:false
  // items), so the normal "find first unanswered item" jump below has
  // nothing to land on; show the interstitial directly instead.
  if (sectionId === DISCLOSURE_SECTION_ID && verificationStore.flowKind === 'buyer') {
    showBuyerDisclosure.value = true
    return
  }
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

// Category tab clicks are a direct alternate exit from the engine section
// (unlike the Hub cards above, reachable without ever going through
// handleReview's guard) — re-clicking the section's OWN already-active tab
// is not a "leave" and skips the guard entirely.
function handleJumpToSectionGuarded(sectionId: string): void {
  if (sectionId === LOCKED_ENGINE_SECTION_ID) {
    handleJumpToSection(sectionId)
    return
  }
  guardLeaveEngineSection(() => handleJumpToSection(sectionId))
}

const ANALYSIS_ROUTE_KEYS = [
  'coreVisionSides',
  'coreVisionRear',
  'coreVisionFrontSuspension',
  'coreVisionEngineBottom',
  'dashboardOcr',
  'coldCheck',
  'engineSensorSession',
  'hotEngineSensorSession',
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

/** BuyerDisclosureCheck.vue's own "下一步" — continues into whatever comes
 *  right after 冷車＋引擎檢查 in the buyer flow (上路's first item), same
 *  "jump past the whole interstitial at once" shape as
 *  handleEngineChoiceContinue above. Falls back to the Hub on the (normally
 *  unreachable) edge case where ENG-08 isn't found. */
function handleBuyerDisclosureAdvance(): void {
  showBuyerDisclosure.value = false
  const lastEngineIndex = verificationStore.flatItems.findIndex(
    (flat) => flat.item.id === ENGINE_SESSION_LAST_ITEM_ID,
  )
  if (lastEngineIndex === -1 || lastEngineIndex >= verificationStore.flatItems.length - 1) {
    hubOpen.value = true
  } else {
    currentIndex.value = lastEngineIndex + 1
  }
}

function handleBuyerDisclosureBack(): void {
  showBuyerDisclosure.value = false
  hubOpen.value = true
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

// Usage tour (VerificationTour.vue) — only for a genuinely fresh, never-
// visited verification (same condition that would show the Hub below), and
// only once ever per device (tourService). Left null until flowLoaded
// resolves so there's no flash-then-hide for users who ARE resuming.
const isFreshVerification = ref<boolean | null>(null)
const tourSeen = ref(tourService.hasSeenTour())
const showTour = computed(() => !tourSeen.value && isFreshVerification.value === true)
function dismissTour(): void {
  tourService.markTourSeen()
  tourSeen.value = true
}

// Defensive net for an "unknown reason" exit mid-冷車＋引擎檢查 — the app
// killed/crashed, or the tab/browser closed outright — none of which any
// router or click guard above can ever see happen. Runs once per fresh
// flowLoaded, off the real server-loaded answers (not anything cached from
// this session), so it catches an interruption from a PAST session just as
// well as one from a moment ago. Purely informational (one button, nothing
// to "keep") — the data is already an abandoned partial attempt the instant
// the user is back here looking at it.
const showEngineSectionResetNotice = ref(false)
let pendingResetNoticeAck: (() => void) | null = null
function acknowledgeEngineSectionResetNotice(): void {
  showEngineSectionResetNotice.value = false
  pendingResetNoticeAck?.()
  pendingResetNoticeAck = null
}

// Resume exactly where the user left off, not "first unanswered item" —
// those are different concepts. A real prior position also bypasses the
// Guided Hub entirely (reload/relaunch mid-verification shouldn't force an
// extra tap back through the section map) — only a genuinely fresh, never-
// visited verification shows the Hub first.
watch(
  () => verificationStore.flowLoaded,
  async (loaded) => {
    if (!loaded) return

    let resumeItemId = initialLastItemId
    // Independent of currentFlat/currentIndex (still 0 at this point, before
    // the resume position below is even applied) — scans BOTH locked
    // sections directly by id so an abandoned 熱車檢查 is caught here exactly
    // as reliably as an abandoned 冷車＋引擎檢查, regardless of where
    // currentIndex happens to be sitting right now.
    const staleLockedSectionId = LOCKED_SECTION_IDS.find((id) => sectionInProgress(id))
    if (staleLockedSectionId) {
      await new Promise<void>((resolve) => {
        pendingResetNoticeAck = resolve
        showEngineSectionResetNotice.value = true
      })
      await verificationStore.resetLockedEngineSection(staleLockedSectionId).catch((error) => {
        console.error('[VerificationStepsView] resetLockedEngineSection (on load) failed:', error)
      })
      // The saved position may have pointed INTO the section just wiped —
      // land on its first item instead of a now-blank item mid-section.
      const lockedSection = verificationStore.sections.find(
        (candidate) => candidate.id === staleLockedSectionId,
      )
      if (
        lockedSection &&
        resumeItemId &&
        lockedSection.items.some((it) => it.id === resumeItemId)
      ) {
        resumeItemId = lockedSection.items[0]?.id ?? null
      }
    }

    const lastIndex = resumeItemId
      ? verificationStore.flatItems.findIndex((flat) => flat.item.id === resumeItemId)
      : -1
    isFreshVerification.value = lastIndex === -1
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
  <VerificationTour v-if="showTour" @done="dismissTour" />
  <VehicleTypeGate v-else-if="needsVehicleTypeGate" @pick="handlePickVehicleType" />
  <BuyerYearGate v-else-if="needsYearGate" @confirm="handleConfirmYear" />
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
  />
  <EngineCompleteChoice
    v-else-if="showEngineCompleteChoice"
    :completing="completing"
    @finish="handleEngineChoiceFinish"
    @continue-to-disclosure="handleEngineChoiceContinue"
  />
  <BuyerDisclosureCheck
    v-else-if="showBuyerDisclosure"
    @back="handleBuyerDisclosureBack"
    @advance="handleBuyerDisclosureAdvance"
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
      (isHotEngineSessionGroup && hotEngineSessionRecording) ||
      (isColdTouchSession && coldTouchRecording) ||
      isCorePhotoGroup ||
      isBasicHealthCheckGroup ||
      needsRideSafetyGate ||
      needsRideTransition
    "
    @back="handleBack"
    @prev="handlePrev"
    @next="handleNext"
    @review="handleReview"
  >
    <template v-if="showCategoryNav" #nav>
      <VerificationCategoryNav
        :sections="verificationStore.sections"
        :current-item-id="currentFlat.item.id"
        :answered-ids="answeredIds"
        @select-section="handleJumpToSectionGuarded"
        @select-item="handleJumpTo"
      />
    </template>

    <RideSafetyGate v-if="needsRideSafetyGate" @confirm="rideSafetyConfirmedIndex = currentIndex" />
    <RideTransition v-else-if="needsRideTransition" :verification-id="id" @advance="handleNext" />
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
    <EngineInspectionFlow
      v-else-if="isHotEngineSessionGroup"
      :verification-id="id"
      mode="hot"
      @advance="handleNext"
      @recording-active="hotEngineSessionRecording = $event"
    />
    <CorePhotoCaptureFlow
      v-else-if="isCorePhotoGroup"
      :verification-id="id"
      :initial-item-id="currentFlat.item.id"
      @advance="handleNext"
      @back="hubOpen = true"
    />
    <BasicHealthCheck13
      v-else-if="isBasicHealthCheckGroup"
      embedded
      :has-chain="vehicleStore.currentVehicle?.hasChain"
      :model-id="vehicleStore.currentVehicle?.modelId"
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

  <div v-if="showLeaveEngineWarning" class="leave-engine-overlay">
    <div class="leave-engine-card">
      <p class="leave-engine-title">確定要離開「冷車＋引擎檢查」？</p>
      <p class="leave-engine-sub">
        這個項目一旦開始就必須一次完成。離開會刪除目前已記錄的影片、錄音與檢測結果，下次需要從頭開始。
      </p>
      <div class="leave-engine-actions">
        <PrimaryButton
          variant="secondary"
          block
          :disabled="resettingEngineSection"
          @click="dismissLeaveEngineWarning"
        >
          返回繼續檢測
        </PrimaryButton>
        <PrimaryButton
          variant="danger"
          block
          :disabled="resettingEngineSection"
          @click="confirmLeaveEngineSection"
        >
          {{ resettingEngineSection ? '刪除中...' : '離開並刪除紀錄' }}
        </PrimaryButton>
      </div>
    </div>
  </div>

  <div v-if="showEngineSectionResetNotice" class="leave-engine-overlay">
    <div class="leave-engine-card">
      <p class="leave-engine-title">「冷車＋引擎檢查」尚未完成</p>
      <p class="leave-engine-sub">
        偵測到上次未把這個項目一次做完，先前記錄的影片、錄音與檢測結果將會清除，需要重新測試。
      </p>
      <div class="leave-engine-actions">
        <PrimaryButton block @click="acknowledgeEngineSectionResetNotice">我知道了</PrimaryButton>
      </div>
    </div>
  </div>
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

.leave-engine-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(15, 23, 42, 0.5);
}

.leave-engine-card {
  width: 100%;
  max-width: 320px;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  text-align: center;
}

.leave-engine-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.leave-engine-sub {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.leave-engine-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}
</style>
