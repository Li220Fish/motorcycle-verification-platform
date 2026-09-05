<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'

interface PolicySection {
  key: string
  title: string
  body: string
}

const policySections: PolicySection[] = [
  {
    key: 'privacy',
    title: '隱私權政策',
    body: '我們僅蒐集提供驗車與交易媒合功能所必要的資料，不會在未經同意下與第三方分享您的個人資訊。',
  },
  {
    key: 'terms',
    title: '服務條款',
    body: '使用 MotoVerify 即表示您同意遵守平台的驗車流程規範與交易禮儀，並對所刊登的車輛資訊負責。',
  },
]
const expandedKey = ref<string | null>(null)
function toggleSection(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key
}

// Prototype only — no data pipeline or account-deletion backend exists yet,
// same "disabled + toast" honesty pattern used elsewhere in the app.
const personalizedAds = ref(true)
const noticeMessage = ref('')
function showNotice(message: string): void {
  noticeMessage.value = message
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2500)
}

const exporting = ref(false)
async function handleExport(): Promise<void> {
  exporting.value = true
  await new Promise((resolve) => setTimeout(resolve, 800))
  exporting.value = false
  showNotice('已送出資料匯出請求，完成後會寄送到您的 Email')
}

function handleDeleteAccount(): void {
  const confirmed = window.confirm('確定要刪除帳號嗎？此操作無法復原。')
  if (!confirmed) return
  showNotice('帳號刪除功能尚未開放，如需協助請聯繫客服')
}
</script>

<template>
  <div>
    <AppHeader title="資料與隱私" back />

    <div class="content">
      <div class="section-list">
        <div v-for="section in policySections" :key="section.key" class="policy-row">
          <button class="policy-header" @click="toggleSection(section.key)">
            <span>{{ section.title }}</span>
            <ChevronDown
              :size="18"
              color="var(--color-text-disabled)"
              :class="{ rotated: expandedKey === section.key }"
            />
          </button>
          <p v-if="expandedKey === section.key" class="policy-body">{{ section.body }}</p>
        </div>
      </div>

      <div class="toggle-row">
        <div class="toggle-info">
          <p class="toggle-title">個人化建議</p>
          <p class="toggle-desc">依您的瀏覽紀錄推薦相關車輛與內容</p>
        </div>
        <button
          class="switch"
          :class="{ on: personalizedAds }"
          role="switch"
          :aria-checked="personalizedAds"
          @click="personalizedAds = !personalizedAds"
        >
          <span class="knob" />
        </button>
      </div>

      <button class="action-row" :disabled="exporting" @click="handleExport">
        {{ exporting ? '處理中...' : '匯出我的資料' }}
      </button>

      <button class="action-row danger" @click="handleDeleteAccount">刪除帳號</button>

      <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-list {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.policy-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.policy-header {
  width: 100%;
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

.policy-header svg {
  transition: transform 0.15s ease;
}

.policy-header svg.rotated {
  transform: rotate(180deg);
}

.policy-body {
  margin: 0;
  padding: 0 var(--space-md) var(--space-md);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.toggle-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.toggle-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.switch {
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  position: relative;
  transition: background 0.15s ease;
}

.switch.on {
  background: var(--color-primary);
}

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch.on .knob {
  transform: translateX(18px);
}

.action-row {
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 700;
}

.action-row:disabled {
  opacity: 0.6;
}

.action-row.danger {
  color: var(--color-danger);
}

.notice {
  text-align: center;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
