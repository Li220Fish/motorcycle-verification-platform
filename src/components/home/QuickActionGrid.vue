<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'

export interface QuickAction {
  icon: Component
  label: string
  /** Route to navigate to, or null for a not-yet-built action (shows a
   * "not available yet" toast instead of a dead link — same pattern already
   * used by SettingsView.vue for unbuilt settings rows). Ignored if
   * `onClick` is set. */
  to: string | null
  /** Escape hatch for an action that isn't a route at all (e.g. scrolling
   * the page to the search bar rather than navigating). */
  onClick?: () => void
}

defineProps<{ actions: QuickAction[] }>()

const router = useRouter()
const noticeMessage = ref('')

function handleClick(action: QuickAction): void {
  if (action.onClick) {
    action.onClick()
    return
  }
  if (action.to) {
    router.push(action.to)
    return
  }
  noticeMessage.value = `「${action.label}」尚未開放`
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}
</script>

<template>
  <div class="quick-actions-wrap">
    <div class="quick-actions">
      <button
        v-for="action in actions"
        :key="action.label"
        class="action-card"
        @click="handleClick(action)"
      >
        <component :is="action.icon" :size="22" color="var(--color-primary)" />
        <span>{{ action.label }}</span>
      </button>
    </div>
    <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>
  </div>
</template>

<style scoped>
.quick-actions-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 76px;
  padding: var(--space-sm) 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
}

.action-card:active {
  transform: scale(0.97);
}

.notice {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
