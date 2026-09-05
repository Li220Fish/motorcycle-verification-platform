<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Bike, ChevronDown } from 'lucide-vue-next'

import EmptyState from '@/components/common/EmptyState.vue'
import { listVehicleKnowledgeEntries } from '@/data/discussion/vehicle-knowledge-mock'
import type { VehicleKnowledgeEntry } from '@/data/discussion/vehicle-knowledge-mock'

const entries = ref<VehicleKnowledgeEntry[]>([])
const loading = ref(true)
const expandedKey = ref<string | null>(null)

function toggle(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key
}

onMounted(() => {
  entries.value = listVehicleKnowledgeEntries()
  loading.value = false
})
</script>

<template>
  <div class="section">
    <p class="demo-notice">目前為 DEMO 展示規格，實際數據以車輛原廠公告為準。</p>

    <p v-if="loading" class="loading">載入中...</p>
    <EmptyState
      v-else-if="entries.length === 0"
      :icon="Bike"
      title="目前沒有車輛資料"
      description="平台上還沒有已建檔的車輛，之後新增車輛就會出現在這裡。"
    />
    <div v-else class="list">
      <div v-for="entry in entries" :key="entry.key" class="entry-card">
        <button class="entry-header" @click="toggle(entry.key)">
          <div class="thumb">
            <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" />
            <Bike v-else :size="26" color="var(--color-text-disabled)" />
          </div>
          <div class="entry-title-block">
            <p class="entry-title">{{ entry.brand }} {{ entry.model }}</p>
            <p class="entry-year">{{ entry.year ? `${entry.year} 年式` : '年式未知' }}</p>
          </div>
          <ChevronDown :size="16" class="chevron" :class="{ open: expandedKey === entry.key }" />
        </button>

        <Transition name="expand">
          <div v-if="expandedKey === entry.key" class="entry-body">
            <p class="release-info">{{ entry.releaseInfo }}</p>
            <p class="summary">{{ entry.summary }}</p>
            <div class="spec-grid">
              <div v-for="spec in entry.specs" :key="spec.label" class="spec-row">
                <span class="spec-label">{{ spec.label }}</span>
                <span class="spec-value">{{ spec.value }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.demo-notice {
  font-size: 12.5px;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  margin: 0;
}

.loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--space-lg) 0;
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.entry-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--color-text-primary);
  text-align: left;
}

.thumb {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-title-block {
  flex: 1;
  min-width: 0;
}

.entry-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-year {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.chevron {
  flex: 0 0 auto;
  color: var(--color-text-disabled);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.entry-body {
  padding: 0 var(--space-md) var(--space-md);
  border-top: 1px solid var(--color-border);
}

.release-info {
  margin: var(--space-sm) 0 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.summary {
  margin: var(--space-xs) 0 0;
  font-size: 13.5px;
  color: var(--color-text-primary);
  line-height: 1.5;
}

.spec-grid {
  margin-top: var(--space-sm);
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.spec-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: 13px;
  background: var(--color-background);
}

.spec-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.spec-label {
  color: var(--color-text-secondary);
}

.spec-value {
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
}

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.18s ease,
    opacity 0.18s ease;
  max-height: 800px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
