<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Share2 } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import { useInspectionReportSections } from '@/composables/useInspectionReportSections'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

// Only the owner gets the share entry point here — a stranger viewing this
// report already arrived via a share link (or the signed-in-stranger "any
// account" path isPublic always allowed), re-sharing isn't a thing they'd
// need. ShareReportView.vue itself (the actual "複製連結" page this links
// to) has no such gate; VerificationResultView.vue's own share button
// (shown right after finishing a verification, before isPublic may even be
// true yet) is the only other entry point into it — this is the one for
// coming back to an already-completed report later.
const isOwner = computed(
  () => !!authStore.user && authStore.user.id === verificationStore.currentVerification?.userId,
)

const verificationIdRef = computed(() => props.id)
const { sections, diagramMarkers, inspectedDate } = useInspectionReportSections(verificationIdRef)

/**
 * A stranger viewing a public verification's report (from a Marketplace
 * listing) can't read the backing `vehicles` doc — it's owner/admin-scoped
 * even when the verification itself is public (that scoping only ever
 * applies to the verification + its answers/evidence, not the vehicle
 * record it points at). MarketplaceListingView.vue already has brand/model/
 * year on hand (its own vehicleSnapshot) and passes them as query params so
 * this title doesn't depend on a fetch that'll just fail for that viewer;
 * the vehicle owner navigating here directly (e.g. from VehicleDetailView)
 * has no query params and falls back to the real fetch below.
 */
const vehicleTitle = computed(() => {
  const queryBrand = route.query.brand
  const queryModel = route.query.model
  if (typeof queryBrand === 'string' && typeof queryModel === 'string') {
    const queryYear = route.query.year
    return `${queryYear ? `${queryYear} ` : ''}${queryBrand} ${queryModel}`.trim()
  }
  // Buyer flow via an appointment — the buyer can never read the seller's
  // vehicles/{id} doc directly (owner/admin-scoped), so this verification's
  // own vehicleSnapshot (written at creation time — see VerificationView
  // .vue's handleStartFromAppointment) is the only reliable source here;
  // vehicleStore.currentVehicle would silently be null for this path.
  const snapshot = verificationStore.currentVerification?.vehicleSnapshot
  if (snapshot) {
    return `${snapshot.manufactureYear ? `${snapshot.manufactureYear} ` : ''}${snapshot.brand} ${snapshot.model}`.trim()
  }
  const vehicle = vehicleStore.currentVehicle
  if (!vehicle) return '—'
  return `${vehicle.manufactureYear ? `${vehicle.manufactureYear} ` : ''}${vehicle.brand} ${vehicle.model}`.trim()
})

// loadFlow (inside the composable) is async, so currentVerification isn't
// populated yet at mount — a reactive watch (not a one-shot onMounted
// check) is what actually catches it landing. Swallows the fetch error
// deliberately: a non-owner viewing a public report has no read access to
// the vehicle doc (see vehicleTitle above), which is expected, not a bug to
// surface.
watch(
  () => verificationStore.currentVerification?.vehicleId,
  (vehicleId) => {
    if (vehicleId) vehicleStore.fetchVehicle(vehicleId).catch(() => {})
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <AppHeader title="檢驗報告" back>
      <template v-if="isOwner" #right>
        <button
          class="icon-button"
          aria-label="分享"
          @click="router.push(`/verification/${props.id}/share`)"
        >
          <Share2 :size="20" />
        </button>
      </template>
    </AppHeader>
    <InspectionReportBody
      :vehicle-title="vehicleTitle"
      :inspected-date="inspectedDate"
      :sections="sections"
      :diagram-markers="diagramMarkers"
    />
  </div>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
}
</style>
