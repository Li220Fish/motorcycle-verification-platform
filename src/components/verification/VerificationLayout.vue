<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VerificationProgress from './VerificationProgress.vue'

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
}>()

defineEmits<{ back: []; prev: []; next: []; review: [] }>()
</script>

<template>
  <div class="verification-layout">
    <AppHeader :title="title" back custom-back @back="$emit('back')">
      <template #right>
        <button class="icon-button" aria-label="Review" @click="$emit('review')">
          <ClipboardList :size="20" />
        </button>
      </template>
    </AppHeader>

    <slot name="nav" />

    <div class="progress-wrap">
      <VerificationProgress :done="done" :total="total" :percent="percent" />
      <p class="section-title">{{ sectionTitle }}</p>
    </div>

    <div class="content">
      <slot />
    </div>

    <div class="footer">
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
  padding-bottom: calc(84px + env(safe-area-inset-bottom));
}

.footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom));
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
