<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VerificationProgress from './VerificationProgress.vue'

withDefaults(
  defineProps<{
    title: string
    sectionTitle: string
    done: number
    total: number
    percent: number
    canGoPrev: boolean
    nextLabel?: string
    nextDisabled?: boolean
    /** WHY "下一步" is disabled — shown above the footer, not just an inert button. */
    nextDisabledHint?: string
    /** Hides Prev/Next entirely — used while EngineInspectionFlow has an
     *  active recording in progress (spec §40: no navigation during
     *  Recording besides its own internal Cancel). */
    hideFooter?: boolean
  }>(),
  { nextLabel: undefined, nextDisabled: false, nextDisabledHint: undefined, hideFooter: false },
)

defineEmits<{ back: []; prev: []; next: []; review: [] }>()
</script>

<template>
  <div class="verification-layout">
    <div class="sticky-header-group">
      <AppHeader :title="title" back custom-back @back="$emit('back')">
        <template #right>
          <button class="icon-button" aria-label="Review" @click="$emit('review')">
            <ClipboardList :size="20" />
          </button>
        </template>
      </AppHeader>

      <slot name="nav" />
    </div>

    <div class="progress-wrap">
      <VerificationProgress :done="done" :total="total" :percent="percent" />
      <p class="section-title">{{ sectionTitle }}</p>
    </div>

    <div class="content">
      <slot />
    </div>

    <div v-if="!hideFooter" class="footer">
      <p v-if="nextDisabled && nextDisabledHint" class="locked-hint">🔒 {{ nextDisabledHint }}</p>
      <div class="footer-buttons">
        <PrimaryButton variant="secondary" :disabled="!canGoPrev" @click="$emit('prev')"
          >上一步</PrimaryButton
        >
        <PrimaryButton block :disabled="nextDisabled" @click="$emit('next')">
          {{ nextLabel ?? '下一步' }}
        </PrimaryButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verification-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

/* Groups AppHeader + the #nav slot (VerificationCategoryNav.vue) under ONE
   sticky container instead of each independently computing its own `top`.
   VerificationCategoryNav.vue used to position itself via `top: calc(var(
   --header-height) + var(--safe-area-inset-top, env(safe-area-inset-top)))` — that assumes the header's
   actual rendered height always equals --header-height plus the inset, but
   AppHeader.vue's real height is content-driven (max(--header-height,
   content + inset)), so on a device with a real inset (found live: 40px)
   the two disagreed by the inset amount, leaving a gap between the header
   and the nav with no sticky element covering it — normally-scrolling
   content behind both (VerificationLayout's own .progress-wrap) became
   briefly visible in that gap while scrolling past it. Sticking the group
   as a unit sidesteps needing to predict the header's height at all: the
   nav just follows it in normal flow, whatever that height turns out to
   be. */
.sticky-header-group {
  position: sticky;
  top: 0;
  z-index: 10;
}

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

.progress-wrap {
  flex: 0 0 auto;
  padding: var(--space-sm) var(--space-md) 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.content {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  /* Reserve space for the fixed footer below so content never renders behind it. */
  padding-bottom: calc(84px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
}

.footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  padding-bottom: calc(
    var(--space-sm) + var(--safe-area-inset-bottom, env(safe-area-inset-bottom))
  );
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  /* Fixed (not sticky-in-flex) so it always stays pinned to the real device
     viewport bottom regardless of parent height quirks (WebView chrome,
     keyboard insets, etc). Safe because this route hides the app's own
     bottom nav (see router meta.hideChrome) — nothing else competes here. */
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 15;
}

.footer-buttons {
  display: flex;
  gap: var(--space-sm);
}

.locked-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-warning, #9a6b0a);
  text-align: center;
}

.footer :deep(.btn) {
  height: 42px;
}

.footer :deep(.btn.secondary) {
  flex: 0 0 auto;
  padding: 0 var(--space-lg);
}
</style>
