<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, ShieldCheck, UserCheck } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import VehicleCard from '@/components/common/VehicleCard.vue'
import { useI18n } from '@/composables/useI18n'
import {
  listingAppointmentLookupService,
  type MyAppointmentWithListing,
} from '@/services/firebase/listing-appointment-lookup.service'
import { verificationService } from '@/services/firebase/verification.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocaleStore } from '@/stores/locale.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { Verification, VerificationType } from '@/types/verification'

const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()
const router = useRouter()
const route = useRoute()
const { t, localeTag } = useI18n()
const localeStore = useLocaleStore()

const submitting = ref(false)
const errorMessage = ref('')

// Arriving from a role Home's own CTA (e.g. Seller's "開始車況驗證") already
// tells us the type — re-asking buyer/seller here would be exactly the
// "先找車輛→再找 Verification→再找開始" friction the Home redesign was
// meant to remove. Only fall back to the picker when arriving without that
// context (e.g. the bottom-nav "驗證" tab).
const presetType = computed<VerificationType | null>(() => {
  const value = route.query.type
  return value === 'seller' || value === 'buyer' ? value : null
})

// Arriving from an existing vehicle's own "開始新的驗證" button already
// tells us which vehicle — no naming step needed, it already has one.
const existingVehicleId = computed<string | null>(() => {
  const value = route.query.vehicleId
  return typeof value === 'string' && value ? value : null
})

// Otherwise the user picks which of their own vehicles this verification is
// for (measurement needs a real vehicle to attach evidence/answers to, not
// just a name) — a garage-empty user can still fall back to naming a bare
// Vehicle record inline, filling in brand/model/plate/engine+chassis numbers
// later via Vehicle edit, since the 45-step checklist has no vehicle-identity
// form step of its own. Set by clicking a type card when there's no
// `presetType`.
const selectedType = ref<VerificationType | null>(null)
const effectiveType = computed<VerificationType | null>(
  () => presetType.value ?? selectedType.value,
)
const verificationName = ref('')
const canStartNamed = computed(() => verificationName.value.trim().length > 0 && !submitting.value)

// Toggled on by "+ 新增車輛" (or forced true once the garage is confirmed
// empty) to fall back to the bare-name creation path below instead of the
// picker.
const creatingNewVehicle = ref(false)
// Never true for buyer — a buyer re-verifies the SELLER's vehicle, never
// their own garage (that used to be this computed's only condition, which
// was the actual bug requirement 2 describes).
const showVehiclePicker = computed(
  () =>
    effectiveType.value !== 'buyer' &&
    vehicleStore.vehicles.length > 0 &&
    !creatingNewVehicle.value,
)

// Buyer vehicle picker — a dropdown over every vehicle the buyer has a live
// (pending/approved) appointment for for, never their own garage. See
// listing-appointment-lookup.service.ts.
const bookableAppointments = ref<MyAppointmentWithListing[]>([])
const selectedAppointmentListingId = ref('')
const showBuyerDropdown = computed(
  () =>
    effectiveType.value === 'buyer' &&
    bookableAppointments.value.length > 0 &&
    !creatingNewVehicle.value,
)

function formatAppointmentDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(localeTag(), {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleConfirmAppointmentSelection(): void {
  const entry = bookableAppointments.value.find(
    (candidate) => candidate.listingId === selectedAppointmentListingId.value,
  )
  if (!entry) return
  void handleStartFromAppointment(entry)
}

// 預約看車提醒 — 約定時間前 1 小時起，那台車直接出現在「尚未完成的驗證」
// 清單裡（草稿＋藍色外框），約定時間過後 2 小時內仍保留（人通常還在現場驗）。
const UPCOMING_WINDOW_MS = 60 * 60 * 1000
const UPCOMING_GRACE_AFTER_MS = 2 * 60 * 60 * 1000
const upcomingAppointments = ref<MyAppointmentWithListing[]>([])

/** An unfinished BUYER verification already started for this appointment's
 *  vehicle — then that existing row is highlighted instead of adding a
 *  second, duplicate row for the same car. */
function activeBuyerVerificationFor(vehicleId: string): Verification | undefined {
  return recentVerifications.value.find(
    (verification) => verification.type === 'buyer' && verification.vehicleId === vehicleId,
  )
}
const upcomingVehicleIds = computed(
  () => new Set(upcomingAppointments.value.map((entry) => entry.vehicleId)),
)
const appointmentRowsWithoutVerification = computed(() =>
  upcomingAppointments.value.filter((entry) => !activeBuyerVerificationFor(entry.vehicleId)),
)
function appointmentTimeFor(vehicleId: string): number | undefined {
  return upcomingAppointments.value.find((entry) => entry.vehicleId === vehicleId)?.appointment
    .scheduledAt
}

const verificationTypes = computed<
  Array<{
    type: VerificationType
    title: string
    description: string
    icon: typeof UserCheck
  }>
>(() => [
  {
    type: 'seller',
    title: t('verificationHome', 'sellerTitle'),
    description: t('verificationHome', 'sellerDescription'),
    icon: ShieldCheck,
  },
  {
    type: 'buyer',
    title: t('verificationHome', 'buyerTitle'),
    description: t('verificationHome', 'buyerDescription'),
    icon: UserCheck,
  },
])

const presetTypeMeta = computed(
  () => verificationTypes.value.find((item) => item.type === presetType.value) ?? null,
)
const effectiveTypeMeta = computed(
  () => verificationTypes.value.find((item) => item.type === effectiveType.value) ?? null,
)

/** Same vehicle may only have ONE non-completed (draft/in_progress)
 * verification at a time, regardless of type — completed ones are the only
 * kind allowed to accumulate. Resuming the caller's own in-flight
 * verification is the expected path (e.g. tapping "開始新的驗證" again after
 * navigating away mid-flow); a different user's in-flight verification on
 * the same vehicle blocks instead of silently redirecting into someone
 * else's draft. */
async function createVerificationRecord(
  vehicleId: string,
  type: VerificationType,
  options?: {
    /** Set when the caller already knows the seller's completed verification
     *  id (e.g. from an appointment's listing — see handleStartFromAppointment
     *  below) — skips the `fetchByVehicle(vehicleId).find(...)` derivation
     *  below, which only ever finds anything when the CALLER owns vehicleId
     *  (firestore.rules' verifications list rule): a buyer re-verifying a
     *  seller's vehicle never owns it, so that derivation silently yields
     *  undefined for every real buyer flow unless this hint is supplied. */
    relatedVerificationIdHint?: string
    /** Buyer only — see Verification['vehicleSnapshot']'s own doc comment. */
    vehicleSnapshot?: Verification['vehicleSnapshot']
    /** Buyer-from-appointment only — see Verification['listingId']. */
    listingId?: string
  },
): Promise<string> {
  if (type === 'buyer' && options?.listingId && authStore.user) {
    // The buyer can't query verifications on the SELLER's vehicle
    // (firestore.rules' list rule) — resume from their own list instead.
    const mine = await verificationService.listByUser(authStore.user.id)
    const resumable = mine.find(
      (verification) =>
        verification.type === 'buyer' &&
        verification.vehicleId === vehicleId &&
        (verification.status === 'draft' || verification.status === 'in_progress'),
    )
    if (resumable) {
      // Don't silently reopen it — let the buyer choose to continue it or
      // start over (only one unfinished verification per vehicle, so
      // starting over deletes the old draft).
      const choice = await askResumeOrRestart(resumable)
      if (choice === 'cancel') throw new ResumeCancelled()
      if (choice === 'resume') return resumable.id
      await verificationStore.deleteVerification(resumable.id)
      recentVerifications.value = recentVerifications.value.filter(
        (verification) => verification.id !== resumable.id,
      )
    }
    return verificationStore.createVerification({
      vehicleId,
      userId: authStore.user.id,
      type,
      status: 'draft',
      relatedVerificationId: options.relatedVerificationIdHint,
      listingId: options.listingId,
      ...(options.vehicleSnapshot ? { vehicleSnapshot: options.vehicleSnapshot } : {}),
    })
  }
  await verificationStore.fetchByVehicle(vehicleId)
  const active = verificationStore.verifications.find(
    (verification) => verification.status === 'draft' || verification.status === 'in_progress',
  )
  if (active) {
    if (active.userId === authStore.user?.id) return active.id
    throw new Error(t('verificationHome', 'errorAlreadyInProgress'))
  }

  let relatedVerificationId = options?.relatedVerificationIdHint
  if (type === 'buyer' && !relatedVerificationId) {
    relatedVerificationId = verificationStore.verifications.find(
      (verification) => verification.type === 'seller' && verification.status === 'completed',
    )?.id
  }
  return verificationStore.createVerification({
    vehicleId,
    userId: authStore.user!.id,
    type,
    status: 'draft',
    relatedVerificationId,
    ...(options?.vehicleSnapshot ? { vehicleSnapshot: options.vehicleSnapshot } : {}),
  })
}

/** Both the 30-分鐘提醒卡片 and the buyer下拉選單 share this — a buyer
 * starting (or resuming) their re-verification for a vehicle they have an
 * appointment on, carrying the seller's verification id + a vehicleSnapshot
 * copy along so the rest of the buyer flow never needs to read
 * vehicles/{vehicleId} directly (owner/admin-only under firestore.rules). */
class ResumeCancelled extends Error {}

/** Resume-or-restart prompt for an appointment car that already has an
 *  unfinished buyer verification. Resolved by the dialog's buttons. */
const resumePrompt = ref<{ verification: Verification } | null>(null)
let resolveResumePrompt: ((choice: 'resume' | 'restart' | 'cancel') => void) | null = null
function askResumeOrRestart(verification: Verification): Promise<'resume' | 'restart' | 'cancel'> {
  resumePrompt.value = { verification }
  return new Promise((resolve) => {
    resolveResumePrompt = resolve
  })
}
function answerResumePrompt(choice: 'resume' | 'restart' | 'cancel'): void {
  resumePrompt.value = null
  resolveResumePrompt?.(choice)
  resolveResumePrompt = null
}

async function handleStartFromAppointment(entry: MyAppointmentWithListing): Promise<void> {
  if (!authStore.user) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const id = await createVerificationRecord(entry.vehicleId, 'buyer', {
      relatedVerificationIdHint: entry.sellerVerificationId ?? undefined,
      listingId: entry.listingId,
      vehicleSnapshot: {
        brand: entry.vehicleSnapshot.brand,
        model: entry.vehicleSnapshot.model,
        manufactureYear: entry.vehicleSnapshot.manufactureYear,
        transmission: entry.vehicleSnapshot.transmission,
        modelId: entry.vehicleSnapshot.modelId ?? null,
      },
    })
    router.push(`/verification/${id}`)
  } catch (error) {
    if (error instanceof ResumeCancelled) return
    errorMessage.value =
      error instanceof Error ? error.message : t('verificationHome', 'errorCreateFailed')
  } finally {
    submitting.value = false
  }
}

async function handleStartExisting(type: VerificationType): Promise<void> {
  if (!existingVehicleId.value || !authStore.user) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const id = await createVerificationRecord(existingVehicleId.value, type)
    router.push(`/verification/${id}`)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('verificationHome', 'errorCreateFailed')
  } finally {
    submitting.value = false
  }
}

/** Picker path (no `existingVehicleId`, but the user has a garage to choose
 * from) — same as `handleStartExisting`, just sourced from a click on one of
 * `vehicleStore.vehicles` instead of the route query. */
async function handleStartWithVehicle(vehicleId: string): Promise<void> {
  const type = effectiveType.value
  if (!type || !authStore.user) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const id = await createVerificationRecord(vehicleId, type)
    router.push(`/verification/${id}`)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('verificationHome', 'errorCreateFailed')
  } finally {
    submitting.value = false
  }
}

/** Picking a type either starts immediately (vehicle already known) or just
 * records the choice so the naming step can render next. */
function handlePickType(type: VerificationType): void {
  if (existingVehicleId.value) {
    void handleStartExisting(type)
  } else {
    selectedType.value = type
  }
}

async function handleConfirmName(): Promise<void> {
  const type = effectiveType.value
  const name = verificationName.value.trim()
  if (!type || !name || !authStore.user) return

  submitting.value = true
  errorMessage.value = ''
  try {
    const vehicleId = await vehicleStore.createVehicle({
      brand: '',
      model: name,
      manufactureYear: null,
      mileage: null,
      photos: [],
    })
    const id = await createVerificationRecord(vehicleId, type)
    router.push(`/verification/${id}`)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('verificationHome', 'errorCreateFailed')
  } finally {
    submitting.value = false
  }
}

// "尚未完成的驗證" — draft/in_progress/needs_review/expired only, bounded to
// 5, sorted most-recent-first, so users can jump back into an unfinished
// verification without hunting through each vehicle's own detail page.
// Completed verifications have their own home (the vehicle's 車庫/履歷 and
// the report views) and would otherwise just pile up here forever.
const RECENT_LIMIT = 5
const recentVerifications = ref<Verification[]>([])
const loadingRecent = ref(false)

const typeLabel = computed<Record<string, string>>(() => ({
  seller: t('verificationHome', 'sellerTitle'),
  buyer: t('verificationHome', 'buyerTitle'),
  professional: t('verificationHome', 'professionalType'),
}))
function statusMeta(status: Verification['status']): {
  label: string
  tone: 'primary' | 'neutral'
} {
  if (status === 'in_progress')
    return { label: t('verificationHome', 'statusInProgress'), tone: 'primary' }
  return { label: t('verificationHome', 'statusDraft'), tone: 'neutral' }
}

function vehicleLabel(verification: Verification): string {
  // A buyer verification is for the SELLER's car — never in the buyer's own
  // garage — so its denormalized vehicleSnapshot is the only source.
  const snapshot = verification.vehicleSnapshot
  if (snapshot) return `${snapshot.brand} ${snapshot.model}`.trim()
  const vehicle = vehicleStore.vehicles.find((candidate) => candidate.id === verification.vehicleId)
  return vehicle ? `${vehicle.brand} ${vehicle.model}` : t('verificationHome', 'unknownVehicle')
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(localeStore.locale === 'en' ? 'en-US' : 'zh-TW')
}

function openRecentVerification(verification: Verification): void {
  router.push(`/verification/${verification.id}`)
}

// Long-press to delete — a plain tap still opens the record, so the delete
// timer is cancelled (and its firing ignored by the click that follows) the
// moment the pointer lifts, moves away, or the browser cancels the gesture.
const LONG_PRESS_MS = 550
let longPressTimer: number | null = null
const longPressTriggered = ref(false)
const deletingId = ref<string | null>(null)

function cancelLongPress(): void {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function handleRecentPointerDown(verification: Verification): void {
  longPressTriggered.value = false
  cancelLongPress()
  longPressTimer = window.setTimeout(() => {
    longPressTriggered.value = true
    void handleDeleteRecent(verification)
  }, LONG_PRESS_MS)
}

function handleRecentClick(verification: Verification): void {
  if (longPressTriggered.value) {
    longPressTriggered.value = false
    return
  }
  openRecentVerification(verification)
}

async function handleDeleteRecent(verification: Verification): Promise<void> {
  const label = `${vehicleLabel(verification)}（${typeLabel.value[verification.type] ?? verification.type}）`
  if (!window.confirm(t('verificationHome', 'deleteConfirm', { label }))) {
    longPressTriggered.value = false
    return
  }
  deletingId.value = verification.id
  try {
    await verificationStore.deleteVerification(verification.id)
    recentVerifications.value = recentVerifications.value.filter(
      (item) => item.id !== verification.id,
    )
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('verificationHome', 'errorDeleteFailed')
  } finally {
    deletingId.value = null
  }
}

async function loadRecentVerifications(): Promise<void> {
  if (!authStore.user) return
  loadingRecent.value = true
  try {
    const all = await verificationService.listByUser(authStore.user.id)
    recentVerifications.value = all
      .filter((verification) => verification.status !== 'completed')
      .slice(0, RECENT_LIMIT)
  } finally {
    loadingRecent.value = false
  }
}

onMounted(async () => {
  // Only needed to resolve vehicle names for "最近的驗證紀錄" below — no
  // longer used to populate a SELLER's vehicle picker (buyer never uses
  // vehicleStore.vehicles at all now — see showVehiclePicker).
  await vehicleStore.fetchVehicles().catch((error) => console.error(error))
  await loadRecentVerifications().catch((error) => console.error(error))
  if (authStore.user) {
    const [bookable, upcoming] = await Promise.all([
      listingAppointmentLookupService.listMyBookableAppointments(authStore.user.id).catch(() => []),
      listingAppointmentLookupService
        .listMyApprovedAppointmentsWithin(
          authStore.user.id,
          UPCOMING_WINDOW_MS,
          UPCOMING_GRACE_AFTER_MS,
        )
        .catch(() => []),
    ])
    bookableAppointments.value = bookable
    upcomingAppointments.value = upcoming
  }
})
</script>

<template>
  <div>
    <AppHeader
      :title="effectiveTypeMeta ? effectiveTypeMeta.title : t('verificationHome', 'startTitle')"
    />

    <div class="content">
      <!-- Existing vehicle (arrived via its own "開始新的驗證"), type not
           preset: pick a type, starts immediately — vehicle is already known. -->
      <template v-if="existingVehicleId && !presetType">
        <p class="question">{{ t('verificationHome', 'typeQuestion') }}</p>
        <div class="type-list">
          <button
            v-for="item in verificationTypes"
            :key="item.type"
            class="type-card"
            :disabled="submitting"
            @click="handlePickType(item.type)"
          >
            <div class="type-icon">
              <component :is="item.icon" :size="22" color="var(--color-primary)" />
            </div>
            <div class="type-info">
              <p class="type-title">{{ item.title }}</p>
              <p class="type-description">{{ item.description }}</p>
            </div>
            <ChevronRight :size="20" color="var(--color-text-disabled)" />
          </button>
        </div>
      </template>

      <!-- Existing vehicle + preset type: confirm and start. -->
      <template v-else-if="existingVehicleId && presetTypeMeta">
        <div class="preset-summary">
          <div class="type-icon">
            <component :is="presetTypeMeta.icon" :size="22" color="var(--color-primary)" />
          </div>
          <div class="type-info">
            <p class="type-title">{{ presetTypeMeta.title }}</p>
            <p class="type-description">{{ presetTypeMeta.description }}</p>
          </div>
        </div>
        <PrimaryButton
          block
          :disabled="submitting"
          @click="handleStartExisting(presetTypeMeta.type)"
        >
          {{ submitting ? t('verificationHome', 'processing') : t('verificationHome', 'start') }}
        </PrimaryButton>
      </template>

      <!-- No existing vehicle, type not chosen yet: pick a type (doesn't
           start yet — the naming step comes next). -->
      <template v-else-if="!effectiveType">
        <p class="question">{{ t('verificationHome', 'typeQuestion') }}</p>
        <div class="type-list">
          <button
            v-for="item in verificationTypes"
            :key="item.type"
            class="type-card"
            @click="handlePickType(item.type)"
          >
            <div class="type-icon">
              <component :is="item.icon" :size="22" color="var(--color-primary)" />
            </div>
            <div class="type-info">
              <p class="type-title">{{ item.title }}</p>
              <p class="type-description">{{ item.description }}</p>
            </div>
            <ChevronRight :size="20" color="var(--color-text-disabled)" />
          </button>
        </div>
      </template>

      <!-- No existing vehicle, type decided (preset or just picked): pick
           which of the user's own vehicles this verification is for —
           measurement needs a real vehicle to attach evidence/answers to.
           Falls back to naming a bare vehicle inline when the garage is
           empty (or the user explicitly wants a new one); brand/model/
           plate/engine+chassis numbers stay blank until edited separately —
           the checklist itself has no vehicle-identity step anymore. -->
      <template v-else>
        <div v-if="effectiveTypeMeta" class="preset-summary">
          <div class="type-icon">
            <component :is="effectiveTypeMeta.icon" :size="22" color="var(--color-primary)" />
          </div>
          <div class="type-info">
            <p class="type-title">{{ effectiveTypeMeta.title }}</p>
            <p class="type-description">{{ effectiveTypeMeta.description }}</p>
          </div>
        </div>

        <template v-if="showVehiclePicker">
          <p class="question">{{ t('verificationHome', 'pickVehicleQuestion') }}</p>
          <div class="vehicle-list">
            <div
              v-for="vehicle in vehicleStore.vehicles"
              :key="vehicle.id"
              class="vehicle-pick-row"
              :class="{ disabled: submitting }"
              role="button"
              tabindex="0"
              @click="!submitting && handleStartWithVehicle(vehicle.id)"
              @keydown.enter="!submitting && handleStartWithVehicle(vehicle.id)"
            >
              <VehicleCard :vehicle="vehicle" />
            </div>
          </div>
          <button class="back-link" @click="creatingNewVehicle = true">
            {{ t('verificationHome', 'addVehicle') }}
          </button>
        </template>

        <!-- 買家複驗：下拉選單選要驗哪台車，來源是買家自己有預約看車的
             listing，不是買家自己的車庫（requirement 2）。 -->
        <template v-else-if="showBuyerDropdown">
          <p class="question">{{ t('verificationHome', 'pickVehicleQuestion') }}</p>
          <label class="field">
            <span>{{ t('verificationHome', 'appointmentLabel') }}</span>
            <select v-model="selectedAppointmentListingId" class="appointment-select">
              <option value="" disabled>{{ t('verificationHome', 'pleaseSelect') }}</option>
              <option
                v-for="entry in bookableAppointments"
                :key="entry.listingId"
                :value="entry.listingId"
              >
                {{ entry.vehicleSnapshot.brand }} {{ entry.vehicleSnapshot.model }}（{{
                  formatAppointmentDateTime(entry.appointment.scheduledAt)
                }}）
              </option>
            </select>
          </label>
          <PrimaryButton
            block
            :disabled="!selectedAppointmentListingId || submitting"
            @click="handleConfirmAppointmentSelection"
          >
            {{ submitting ? t('verificationHome', 'processing') : t('verificationHome', 'start') }}
          </PrimaryButton>
          <button class="back-link" @click="creatingNewVehicle = true">
            {{ t('verificationHome', 'noAppointmentYet') }}
          </button>
        </template>

        <template v-else>
          <label class="field">
            <span>{{ t('verificationHome', 'nameVerificationLabel') }}</span>
            <input
              v-model="verificationName"
              type="text"
              :placeholder="t('verificationHome', 'nameVerificationPlaceholder')"
              maxlength="30"
            />
          </label>
          <button
            v-if="
              (effectiveType !== 'buyer' && vehicleStore.vehicles.length > 0) ||
              (effectiveType === 'buyer' && bookableAppointments.length > 0)
            "
            class="back-link"
            @click="creatingNewVehicle = false"
          >
            ‹
            {{
              effectiveType === 'buyer'
                ? t('verificationHome', 'pickAppointedVehicle')
                : t('verificationHome', 'pickExistingVehicle')
            }}
          </button>

          <PrimaryButton block :disabled="!canStartNamed" @click="handleConfirmName">
            {{ submitting ? t('verificationHome', 'processing') : t('verificationHome', 'start') }}
          </PrimaryButton>
        </template>

        <button v-if="!presetType" class="back-link" @click="selectedType = null">
          {{ t('verificationHome', 'reselectType') }}
        </button>
      </template>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <p class="hint">{{ t('verificationHome', 'durationHint') }}</p>

      <div
        v-if="recentVerifications.length > 0 || appointmentRowsWithoutVerification.length > 0"
        class="recent-section"
      >
        <div class="recent-header">
          <h3 class="recent-title">{{ t('verificationHome', 'unfinishedTitle') }}</h3>
          <span class="recent-hint">{{ t('verificationHome', 'longPressToDelete') }}</span>
        </div>
        <div class="recent-list">
          <!-- 預約看車前 1 小時：還沒開始驗的那台車以草稿＋藍框出現在最上面，
               點了就直接開始（或接續）買家驗證。 -->
          <button
            v-for="entry in appointmentRowsWithoutVerification"
            :key="`appointment-${entry.appointment.id}`"
            class="recent-row upcoming-appointment-row"
            @click="handleStartFromAppointment(entry)"
          >
            <div class="recent-info">
              <p class="recent-vehicle">
                {{ entry.vehicleSnapshot.brand }} {{ entry.vehicleSnapshot.model }}
              </p>
              <p class="recent-meta">
                {{ typeLabel.buyer }} ·
                {{
                  t('verificationHome', 'scheduledAt', {
                    time: formatAppointmentDateTime(entry.appointment.scheduledAt),
                  })
                }}
              </p>
            </div>
            <StatusBadge tone="neutral">{{ t('verificationHome', 'statusDraft') }}</StatusBadge>
            <ChevronRight :size="18" color="var(--color-text-disabled)" />
          </button>
          <button
            v-for="verification in recentVerifications"
            :key="verification.id"
            class="recent-row"
            :class="{
              deleting: deletingId === verification.id,
              'upcoming-appointment-row':
                verification.type === 'buyer' && upcomingVehicleIds.has(verification.vehicleId),
            }"
            :disabled="deletingId === verification.id"
            @pointerdown="handleRecentPointerDown(verification)"
            @pointerup="cancelLongPress"
            @pointerleave="cancelLongPress"
            @pointercancel="cancelLongPress"
            @contextmenu.prevent
            @click="handleRecentClick(verification)"
          >
            <div class="recent-info">
              <p class="recent-vehicle">{{ vehicleLabel(verification) }}</p>
              <p class="recent-meta">
                {{ typeLabel[verification.type] ?? verification.type }} ·
                <template
                  v-if="verification.type === 'buyer' && appointmentTimeFor(verification.vehicleId)"
                >
                  {{
                    t('verificationHome', 'scheduledAt', {
                      time: formatAppointmentDateTime(appointmentTimeFor(verification.vehicleId)!),
                    })
                  }}
                </template>
                <template v-else>{{ formatDate(verification.createdAt) }}</template>
              </p>
            </div>
            <StatusBadge :tone="statusMeta(verification.status).tone">
              {{ statusMeta(verification.status).label }}
            </StatusBadge>
            <ChevronRight :size="18" color="var(--color-text-disabled)" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="resumePrompt" class="resume-overlay" @click.self="answerResumePrompt('cancel')">
      <div class="resume-card">
        <p class="resume-title">{{ t('verificationHome', 'resumeTitle') }}</p>
        <p class="resume-body">
          {{
            t('verificationHome', 'resumeBody', {
              status: statusMeta(resumePrompt.verification.status).label,
            })
          }}
        </p>
        <PrimaryButton block @click="answerResumePrompt('resume')">
          {{ t('verificationHome', 'resumeContinue') }}
        </PrimaryButton>
        <PrimaryButton variant="secondary" block @click="answerResumePrompt('restart')">
          {{ t('verificationHome', 'resumeRestart') }}
        </PrimaryButton>
        <button class="resume-cancel" @click="answerResumePrompt('cancel')">
          {{ t('common', 'cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resume-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(15, 23, 42, 0.5);
}

.resume-card {
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

.resume-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.resume-body {
  margin: 0 0 var(--space-xs);
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.resume-cancel {
  border: none;
  background: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 6px;
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.field input,
.appointment-select {
  height: 46px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.appointment-select {
  width: 100%;
  font-family: inherit;
}

.question {
  font-size: 16px;
  font-weight: 700;
}

.back-link {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
  padding: 0;
  margin-top: -6px;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.vehicle-pick-row {
  cursor: pointer;
}

.vehicle-pick-row.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.preset-summary {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.type-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.type-card:disabled {
  opacity: 0.55;
}

.type-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: #e8f1fd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.type-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.error {
  color: var(--color-danger);
  font-size: 14px;
}

.hint {
  text-align: center;
  color: var(--color-text-disabled);
  font-size: 13px;
}

.recent-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: 4px;
}

.recent-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.recent-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.recent-hint {
  font-size: 11.5px;
  color: var(--color-text-disabled);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.recent-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.upcoming-appointment-row {
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary) inset;
  width: 100%;
}

.recent-row.deleting {
  opacity: 0.5;
  pointer-events: none;
}

.recent-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-vehicle {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
