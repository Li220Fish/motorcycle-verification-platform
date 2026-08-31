<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

import StatusBadge from '@/components/common/StatusBadge.vue'

export interface ReportItem {
  id: string
  title: string
  description: string
  badgeLabel: string
  badgeTone: 'success' | 'warning' | 'neutral' | 'danger' | 'primary'
  note?: string
}

export interface ReportSection {
  id: string
  title: string
  statusLabel: string
  statusTone: 'success' | 'warning' | 'neutral' | 'danger' | 'primary'
  items: ReportItem[]
}

defineProps<{
  vehicleTitle: string
  inspectedDate: string
  score: number | null
  sections: ReportSection[]
}>()

// Presentational only — the real report (per-verification data) and the
// Marketplace mock report (per-listing fabricated data) both feed this the
// same normalized shape so the hero/score/category-accordion UI is defined
// exactly once.
const expandedSectionId = ref<string | null>(null)
function toggleSection(sectionId: string): void {
  expandedSectionId.value = expandedSectionId.value === sectionId ? null : sectionId
}
</script>

<template>
  <div class="content">
    <div class="hero">
      <p class="hero-title">{{ vehicleTitle }}</p>
      <p class="hero-date">檢驗日期：{{ inspectedDate }}</p>
    </div>

    <div class="score-card">
      <p class="score-label">檢驗總評分</p>
      <p v-if="score !== null" class="score-value">
        <span class="score-number">{{ score }}</span>
        <span class="score-max">／100</span>
      </p>
      <p v-else class="score-pending">尚無足夠資料計算</p>
    </div>

    <div class="category-list">
      <div v-for="section in sections" :key="section.id" class="category-card">
        <button class="category-header" @click="toggleSection(section.id)">
          <span class="category-title">{{ section.title }}</span>
          <StatusBadge :tone="section.statusTone">{{ section.statusLabel }}</StatusBadge>
          <ChevronDown
            :size="16"
            class="chevron"
            :class="{ open: expandedSectionId === section.id }"
          />
        </button>

        <Transition name="expand">
          <div v-if="expandedSectionId === section.id" class="item-list">
            <div v-for="item in section.items" :key="item.id" class="item-row">
              <div class="item-text">
                <p class="item-title">{{ item.title }}</p>
                <p class="item-description">{{ item.description }}</p>
                <p v-if="item.note" class="item-note">備註：{{ item.note }}</p>
              </div>
              <StatusBadge :tone="item.badgeTone">{{ item.badgeLabel }}</StatusBadge>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hero {
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, #1b3fae 100%);
  color: #fff;
}

.hero-title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
}

.hero-date {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.score-card {
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.score-label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.score-value {
  margin: 0;
}

.score-number {
  font-size: 40px;
  font-weight: 800;
  color: var(--color-primary);
}

.score-max {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-disabled);
}

.score-pending {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-disabled);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.category-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-md);
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--color-text-primary);
  text-align: left;
}

.category-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
}

.chevron {
  flex: 0 0 auto;
  color: var(--color-text-disabled);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.item-list {
  border-top: 1px solid var(--color-border);
}

.item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
}

.item-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.item-text {
  min-width: 0;
}

.item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-description {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.item-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.18s ease,
    opacity 0.18s ease;
  max-height: 4000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
