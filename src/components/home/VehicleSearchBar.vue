<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, Search, ShieldCheck } from 'lucide-vue-next'

import { vehicleSearchService } from '@/services/search/vehicle-search.service'
import type { VehicleSearchResult } from '@/services/search/vehicle-search.service'

const query = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const results = ref<VehicleSearchResult[]>([])
const errorMessage = ref('')

async function handleSearch(): Promise<void> {
  const trimmed = query.value.trim()
  if (!trimmed) {
    status.value = 'idle'
    return
  }
  status.value = 'loading'
  errorMessage.value = ''
  try {
    results.value = await vehicleSearchService.search(trimmed)
    status.value = 'done'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '搜尋失敗'
    status.value = 'error'
  }
}
</script>

<template>
  <div class="search-block">
    <!-- <form class="search-bar" @submit.prevent="handleSearch">
      <Search :size="18" color="var(--color-text-disabled)" />
      <input v-model="query" type="search" placeholder="輸入查詢車名" aria-label="輸入查詢車名" />
      <button type="submit" class="search-submit" aria-label="搜尋">
        <Search :size="18" color="#fff" />
      </button>
    </form> 主頁暫時不需要搜尋功能--> 

    <div v-if="status === 'loading'" class="search-panel loading">
      <div class="spinner" />
      <span>搜尋中...</span>
    </div>

    <div v-else-if="status === 'error'" class="search-panel error">
      <AlertTriangle :size="18" color="var(--color-danger)" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-else-if="status === 'done' && results.length === 0" class="search-panel empty">
      <span>找不到符合「{{ query }}」的車輛，換個關鍵字試試？</span>
    </div>

    <div v-else-if="status === 'done'" class="search-panel results">
      <span class="demo-tag">DEMO 搜尋結果</span>
      <button v-for="item in results" :key="item.id" class="result-row">
        <span class="result-info">
          <span class="result-title">{{ item.brand }} {{ item.model }}</span>
          <span class="result-sub">{{ item.year }} · {{ item.mileageKm.toLocaleString() }} km</span>
        </span>
        <span v-if="item.verificationAvailable" class="result-verified">
          <ShieldCheck :size="14" /> 已驗證 {{ item.lastVerifiedAt }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 52px;
  padding: 0 var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--color-text-primary);
  background: transparent;
}

.search-bar input::placeholder {
  color: var(--color-text-disabled);
}

.search-submit {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-panel {
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.search-panel.loading {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.search-panel.error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-color: transparent;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.search-panel.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm);
}

.demo-tag {
  align-self: flex-start;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: 999px;
  padding: 2px 9px;
  margin: 2px 4px 2px;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-sm);
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  text-align: left;
}

.result-row:hover {
  background: var(--color-background);
}

.result-info {
  display: flex;
  flex-direction: column;
}

.result-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.result-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.result-verified {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-success);
}
</style>
