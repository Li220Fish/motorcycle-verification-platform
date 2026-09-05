<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import Logo from '@/components/common/Logo.vue'

const APP_VERSION = '1.0.0-beta'

interface AboutRow {
  key: string
  label: string
}

const rows: AboutRow[] = [
  { key: 'terms', label: '服務條款' },
  { key: 'privacy', label: '隱私權政策' },
  { key: 'faq', label: '常見問題' },
  { key: 'contact', label: '聯絡我們' },
]

const noticeMessage = ref('')
function handleRowClick(row: AboutRow): void {
  noticeMessage.value = `「${row.label}」尚未開放`
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}
</script>

<template>
  <div>
    <AppHeader title="關於 MotoVerify" back />

    <div class="content">
      <div class="brand-card">
        <Logo size="lg" />
        <p class="version">版本 {{ APP_VERSION }}</p>
        <p class="tagline">用可信的車況資料，串起買家與賣家。</p>
      </div>

      <div class="section-list">
        <button v-for="row in rows" :key="row.key" class="section-row" @click="handleRowClick(row)">
          <span>{{ row.label }}</span>
          <ChevronRight :size="18" color="var(--color-text-disabled)" />
        </button>
      </div>

      <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

      <p class="copyright">© {{ new Date().getFullYear() }} MotoVerify. All rights reserved.</p>
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

.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-xl) var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.version {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.tagline {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.section-list {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.section-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.notice {
  text-align: center;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.copyright {
  text-align: center;
  font-size: 11.5px;
  color: var(--color-text-disabled);
  margin: 0;
}
</style>
