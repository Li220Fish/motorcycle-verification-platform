<script setup lang="ts">
import { computed } from 'vue'
import { Check, ChevronRight } from 'lucide-vue-next'

import MotorcycleDiagram from './MotorcycleDiagram.vue'
import { APPEARANCE_CAPTURE_GROUPS } from '@/data/verification/appearance-groups'
import { useVerificationStore } from '@/stores/verification.store'

const emit = defineEmits<{ selectGroup: [string] }>()

const verificationStore = useVerificationStore()

const groupsWithProgress = computed(() =>
  APPEARANCE_CAPTURE_GROUPS.map((group) => {
    const done = group.itemIds.filter((id) => verificationStore.answers[id]).length
    return { ...group, done, total: group.itemIds.length, complete: done === group.itemIds.length }
  }),
)

const highlights = computed(() =>
  groupsWithProgress.value.map((group) => ({
    id: group.id,
    label: group.label,
    ...group.highlight,
  })),
)

const overallDone = computed(() =>
  groupsWithProgress.value.reduce((sum, group) => sum + group.done, 0),
)
const overallTotal = computed(() =>
  groupsWithProgress.value.reduce((sum, group) => sum + group.total, 0),
)
</script>

<template>
  <div class="capture-map">
    <p class="lead">
      點選部位開始拍攝 <span class="count">{{ overallDone }}/{{ overallTotal }}</span>
    </p>

    <MotorcycleDiagram
      :highlights="highlights"
      interactive
      @select="(id) => emit('selectGroup', id)"
    />

    <div class="group-list">
      <button
        v-for="group in groupsWithProgress"
        :key="group.id"
        class="group-row"
        @click="emit('selectGroup', group.id)"
      >
        <span class="row-status" :class="{ done: group.complete }">
          <Check v-if="group.complete" :size="12" />
        </span>
        <span class="row-title">{{ group.label }}</span>
        <span class="row-count">{{ group.done }}/{{ group.total }}</span>
        <ChevronRight :size="16" color="var(--color-text-disabled)" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.capture-map {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.lead {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.count {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 12px var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  text-align: left;
}

.row-status {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 1.5px solid var(--color-border);
  color: #fff;
}

.row-status.done {
  background: var(--color-success);
  border-color: var(--color-success);
}

.row-title {
  flex: 1;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.row-count {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}
</style>
