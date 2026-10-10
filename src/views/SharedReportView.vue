<script setup lang="ts">
/**
 * Public, unauthenticated verification report — the one page in this app a
 * complete stranger with no account can open (router/index.ts's `/share/:id`,
 * `requiresAuth: false`). Shows the same section/item structure as
 * VerificationReportView.vue, but with InspectionReportBody.vue's
 * `restricted` mode on for anyone who isn't a REAL signed-in account —
 * photos and AI judgement text are replaced with a "登入後查看詳情" prompt;
 * everything else (what was checked, normal/attention/unsure per item, the
 * user's own notes) stays visible, since showing the shape of the report is
 * the whole point of a shareable link.
 *
 * Gets in by signing the visitor in ANONYMOUSLY on mount if there's no
 * session at all yet — satisfies firestore.rules' signedIn() (every isPublic
 * verification/answers/evidence read rule only ever checks that, never
 * ownership) with zero friction, while auth.store.ts's isAuthenticated
 * deliberately never counts an anonymous session, so this stays the only
 * door that session can walk through. A REAL signed-in visitor (clicked the
 * link while already logged into the main app) skips the anonymous sign-in
 * entirely and sees the unrestricted report, same as
 * VerificationReportView.vue always has.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ShieldCheck } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useInspectionReportSections } from '@/composables/useInspectionReportSections'
import { auth } from '@/services/firebase/firebase'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ id: string }>()

const route = useRoute()
const authStore = useAuthStore()

// Fired here — a plain synchronous statement during setup(), NOT inside
// onMounted() — specifically so it starts before useInspectionReportSections
// below sets up its own `watch(..., { immediate: true })`, which fires a
// ONE-SHOT getDoc() (verificationService.get(), no auto-retry once denied)
// synchronously as part of THIS SAME setup() pass. onMounted callbacks only
// run after setup() returns and the component is actually mounted, i.e.
// strictly later — putting the sign-in there left a real gap where that
// one-shot read could fire while still fully unauthenticated.
authStore.initialize()
if (!auth.currentUser) void authStore.signInAnonymous()

const verificationIdRef = computed(() => props.id)
const { sections, diagramMarkers, inspectedDate, loading, loadError } =
  useInspectionReportSections(verificationIdRef)

// No vehicles/{id} access exists for a stranger (that doc has no isPublic
// branch at all, unlike the verification/answers/evidence it points at —
// see VerificationReportView.vue's own comment on the same constraint), so
// this page has no fallback fetch to try: brand/model/year come from the
// share link's own query params (ShareReportView.vue embeds them when it
// builds the link, same pattern MarketplaceListingView.vue already uses for
// VerificationReportView.vue's own query-param fallback) or the title is
// just generic.
const vehicleTitle = computed(() => {
  const queryBrand = route.query.brand
  const queryModel = route.query.model
  if (typeof queryBrand === 'string' && typeof queryModel === 'string') {
    const queryYear = route.query.year
    return `${queryYear ? `${queryYear} ` : ''}${queryBrand} ${queryModel}`.trim()
  }
  return '車輛驗證報告'
})

const isRealUser = computed(() => authStore.user !== null && !authStore.user.isAnonymous)
</script>

<template>
  <div>
    <AppHeader title="檢驗報告" />

    <EmptyState
      v-if="!loading && loadError"
      :icon="ShieldCheck"
      title="找不到這份報告"
      description="連結可能有誤，或這份報告尚未公開分享。"
    />
    <template v-else>
      <InspectionReportBody
        :vehicle-title="vehicleTitle"
        :inspected-date="inspectedDate"
        :sections="sections"
        :diagram-markers="diagramMarkers"
        :restricted="!isRealUser"
      />
      <div v-if="!isRealUser" class="login-banner">
        <p>登入 RiDE 帳號即可查看完整照片與 AI 判定說明</p>
        <PrimaryButton block @click="$router.push({ name: 'login' })">登入／註冊</PrimaryButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.login-banner {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  padding-bottom: calc(
    var(--space-md) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom))
  );
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.06);
}

.login-banner p {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}
</style>
