<script setup lang="ts">
import { reactive } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'

interface ToggleRow {
  key: string
  label: string
  desc: string
}

const rows: ToggleRow[] = [
  { key: 'push', label: '推播通知', desc: '接收 App 的推播提醒' },
  { key: 'chat', label: '訊息通知', desc: '有新的聊天訊息時通知我' },
  { key: 'trade', label: '交易通知', desc: '刊登有新詢問或狀態更新時通知我' },
  { key: 'maintenance', label: '保養提醒', desc: '車輛保養週期將到時提前通知我' },
  { key: 'system', label: '系統公告', desc: '重要系統與政策異動通知' },
]

// Prototype only — no notification backend exists yet, so these toggles
// don't persist anywhere; they just demonstrate the intended interaction.
const state = reactive<Record<string, boolean>>({
  push: true,
  chat: true,
  trade: true,
  maintenance: true,
  system: false,
})

function toggle(key: string): void {
  state[key] = !state[key]
}
</script>

<template>
  <div>
    <AppHeader title="通知" back />

    <div class="content">
      <div v-for="row in rows" :key="row.key" class="toggle-row">
        <div class="toggle-info">
          <p class="toggle-title">{{ row.label }}</p>
          <p class="toggle-desc">{{ row.desc }}</p>
        </div>
        <button
          class="switch"
          :class="{ on: state[row.key] }"
          role="switch"
          :aria-checked="state[row.key]"
          @click="toggle(row.key)"
        >
          <span class="knob" />
        </button>
      </div>
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
</style>
