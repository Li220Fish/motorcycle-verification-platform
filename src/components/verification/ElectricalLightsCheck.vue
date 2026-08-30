<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Check } from 'lucide-vue-next'

import IssuePhotoCapture from './IssuePhotoCapture.vue'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationItem } from '@/data/verification'

const props = defineProps<{
  verificationId: string
  /** ELEC-01..09 in data order: 日光燈, 近燈, 遠燈, 尾燈, 煞車燈, 左前, 右前, 左後, 右後. */
  items: VerificationItem[]
}>()

const verificationStore = useVerificationStore()

// Grouped purely by fixed data-order slicing (see prop doc) — matches the
// UX-report wireframe's 前方 / 後方 / 方向燈 grouping without re-declaring
// which light is which a second time in this component.
const frontLights = computed(() => props.items.slice(0, 3))
const rearLights = computed(() => props.items.slice(3, 5))
const turnLights = computed(() => props.items.slice(5, 9))

const doneCount = computed(
  () => props.items.filter((it) => verificationStore.answers[it.id]).length,
)

function resultOf(itemId: string): string | null {
  return verificationStore.answers[itemId]?.result ?? null
}

function markNormal(itemId: string): void {
  verificationStore.saveAnswer(itemId, 'normal')
}

function markAttention(itemId: string): void {
  verificationStore.saveAnswer(itemId, 'attention')
}
</script>

<template>
  <div class="lights-check">
    <p class="lead">
      燈具快速檢查 <span class="count">{{ doneCount }}/{{ items.length }}</span>
    </p>

    <template
      v-for="(group, groupIndex) in [
        { label: '前方', lights: frontLights },
        { label: '後方', lights: rearLights },
        { label: '方向燈', lights: turnLights },
      ]"
      :key="groupIndex"
    >
      <p class="group-label">{{ group.label }}</p>
      <div v-for="light in group.lights" :key="light.id" class="light-row">
        <div class="light-main">
          <span class="light-title">{{ light.title }}</span>
          <div class="light-actions">
            <button
              class="quick-btn ok"
              :class="{ active: resultOf(light.id) === 'normal' }"
              aria-label="正常"
              @click="markNormal(light.id)"
            >
              <Check :size="18" />
            </button>
            <button
              class="quick-btn bad"
              :class="{ active: resultOf(light.id) === 'attention' }"
              aria-label="異常"
              @click="markAttention(light.id)"
            >
              <AlertTriangle :size="18" />
            </button>
          </div>
        </div>
        <IssuePhotoCapture
          v-if="resultOf(light.id) === 'attention'"
          :verification-id="verificationId"
          :item-id="light.id"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.lights-check {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lead {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.count {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.group-label {
  margin: 10px 0 2px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-disabled);
  letter-spacing: 0.02em;
}

.light-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.light-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.light-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.light-actions {
  display: flex;
  gap: 8px;
}

.quick-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-disabled);
}

.quick-btn.ok.active {
  border-color: var(--color-success);
  background: var(--color-success-bg);
  color: var(--color-success);
}

.quick-btn.bad.active {
  border-color: var(--color-danger);
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
</style>
