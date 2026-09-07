<script setup lang="ts">
import { Check, Languages, Monitor, Moon, Sun, Type } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import { useThemeStore } from '@/stores/theme.store'
import type { ThemeMode } from '@/stores/theme.store'

const themeStore = useThemeStore()

const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: '淺色', icon: Sun },
  { mode: 'dark', label: '深色', icon: Moon },
  { mode: 'system', label: '跟隨系統', icon: Monitor },
]
</script>

<template>
  <div>
    <AppHeader title="調整設置" back />

    <div class="content">
      <div class="section">
        <p class="section-title">外觀</p>
        <div class="option-list">
          <button
            v-for="option in themeOptions"
            :key="option.mode"
            class="option-row"
            @click="themeStore.setMode(option.mode)"
          >
            <component :is="option.icon" :size="18" color="var(--color-text-secondary)" />
            <span>{{ option.label }}</span>
            <Check v-if="themeStore.mode === option.mode" :size="18" color="var(--color-primary)" />
          </button>
        </div>
      </div>

      <div class="section">
        <p class="section-title">其他</p>
        <div class="option-list">
          <button class="option-row" disabled>
            <Languages :size="18" color="var(--color-text-disabled)" />
            <span>語言</span>
            <span class="coming-soon">即將推出</span>
          </button>
          <button class="option-row" disabled>
            <Type :size="18" color="var(--color-text-disabled)" />
            <span>字體大小</span>
            <span class="coming-soon">即將推出</span>
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

.option-row:disabled {
  color: var(--color-text-disabled);
}

.coming-soon {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-disabled);
}
</style>
