<script setup lang="ts">
import { Check, Monitor, Moon, Sun } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import { useI18n } from '@/composables/useI18n'
import { useFontSizeStore } from '@/stores/font-size.store'
import type { FontSize } from '@/stores/font-size.store'
import { useLocaleStore } from '@/stores/locale.store'
import type { Locale } from '@/stores/locale.store'
import { useThemeStore } from '@/stores/theme.store'
import type { ThemeMode } from '@/stores/theme.store'

const themeStore = useThemeStore()
const localeStore = useLocaleStore()
const fontSizeStore = useFontSizeStore()
const { t } = useI18n()

const themeOptions: { mode: ThemeMode; labelKey: 'light' | 'dark' | 'system'; icon: typeof Sun }[] =
  [
    { mode: 'light', labelKey: 'light', icon: Sun },
    { mode: 'dark', labelKey: 'dark', icon: Moon },
    { mode: 'system', labelKey: 'system', icon: Monitor },
  ]

const localeOptions: { value: Locale; labelKey: 'languageZh' | 'languageEn' }[] = [
  { value: 'zh', labelKey: 'languageZh' },
  { value: 'en', labelKey: 'languageEn' },
]

const fontSizeOptions: { value: FontSize; labelKey: 'fontSmall' | 'fontMedium' | 'fontLarge' }[] = [
  { value: 'small', labelKey: 'fontSmall' },
  { value: 'medium', labelKey: 'fontMedium' },
  { value: 'large', labelKey: 'fontLarge' },
]
</script>

<template>
  <div>
    <AppHeader :title="t('preferences', 'title')" back />

    <div class="content">
      <div class="section">
        <p class="section-title">{{ t('preferences', 'appearance') }}</p>
        <div class="option-list">
          <button
            v-for="option in themeOptions"
            :key="option.mode"
            class="option-row"
            @click="themeStore.setMode(option.mode)"
          >
            <component :is="option.icon" :size="18" color="var(--color-text-secondary)" />
            <span>{{ t('preferences', option.labelKey) }}</span>
            <Check v-if="themeStore.mode === option.mode" :size="18" color="var(--color-primary)" />
          </button>
        </div>
      </div>

      <div class="section">
        <p class="section-title">{{ t('preferences', 'language') }}</p>
        <div class="option-list">
          <button
            v-for="option in localeOptions"
            :key="option.value"
            class="option-row"
            @click="localeStore.setLocale(option.value)"
          >
            <span>{{ t('preferences', option.labelKey) }}</span>
            <Check
              v-if="localeStore.locale === option.value"
              :size="18"
              color="var(--color-primary)"
            />
          </button>
        </div>
      </div>

      <div class="section">
        <p class="section-title">{{ t('preferences', 'fontSize') }}</p>
        <div class="option-list segmented">
          <button
            v-for="option in fontSizeOptions"
            :key="option.value"
            class="segment"
            :class="{ active: fontSizeStore.size === option.value }"
            @click="fontSizeStore.setSize(option.value)"
          >
            {{ t('preferences', option.labelKey) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.option-list {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.option-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.option-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.option-row span:first-of-type {
  flex: 1;
}

.segmented {
  flex-direction: row;
  padding: 4px;
  gap: 4px;
}

.segment {
  flex: 1;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.segment.active {
  background: var(--color-primary);
  color: #fff;
}
</style>
