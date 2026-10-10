<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import { useI18n } from '@/composables/useI18n'
import { notificationPrefsService } from '@/services/firebase/notification-prefs.service'
import { useAuthStore } from '@/stores/auth.store'
import { DEFAULT_NOTIFICATION_PREFS } from '@/types/notification'
import type { NotificationPrefs } from '@/types/notification'

const authStore = useAuthStore()
const { t } = useI18n()

interface ToggleRow {
  key: keyof NotificationPrefs
  labelKey:
    | 'pushLabel'
    | 'chatLabel'
    | 'tradeLabel'
    | 'discussionLabel'
    | 'vehicleNewsLabel'
    | 'systemLabel'
  descKey:
    'pushDesc' | 'chatDesc' | 'tradeDesc' | 'discussionDesc' | 'vehicleNewsDesc' | 'systemDesc'
}

// One row per real NotificationType category (functions/src/services/
// notification-dispatch.service.ts's categoryForType) — every one of the
// app's 13 notification types maps to exactly one of these 5, plus the
// separate `push` master switch. No "保養提醒" row: no maintenance-reminder
// notification has ever existed in this codebase, so a toggle for it would
// control nothing.
const rows: ToggleRow[] = [
  { key: 'push', labelKey: 'pushLabel', descKey: 'pushDesc' },
  { key: 'chat', labelKey: 'chatLabel', descKey: 'chatDesc' },
  { key: 'trade', labelKey: 'tradeLabel', descKey: 'tradeDesc' },
  { key: 'discussion', labelKey: 'discussionLabel', descKey: 'discussionDesc' },
  { key: 'vehicleNews', labelKey: 'vehicleNewsLabel', descKey: 'vehicleNewsDesc' },
  { key: 'system', labelKey: 'systemLabel', descKey: 'systemDesc' },
]

const state = reactive<NotificationPrefs>({ ...DEFAULT_NOTIFICATION_PREFS })
const loading = ref(true)
const savingKey = ref<keyof NotificationPrefs | null>(null)
const errorMessage = ref('')

onMounted(async () => {
  const uid = authStore.user?.id
  if (!uid) {
    loading.value = false
    return
  }
  try {
    const prefs = await notificationPrefsService.getPrefs(uid)
    Object.assign(state, prefs)
  } finally {
    loading.value = false
  }
})

async function toggle(key: keyof NotificationPrefs): Promise<void> {
  const uid = authStore.user?.id
  if (!uid || savingKey.value) return
  const next = !state[key]
  const previous = state[key]
  state[key] = next
  savingKey.value = key
  errorMessage.value = ''
  try {
    await notificationPrefsService.updatePrefs(uid, { [key]: next })
  } catch (error) {
    state[key] = previous
    errorMessage.value = error instanceof Error ? error.message : '設定失敗，請稍後再試'
  } finally {
    savingKey.value = null
  }
}
</script>

<template>
  <div>
    <AppHeader :title="t('notificationSettings', 'title')" back />

    <div class="content">
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div v-for="row in rows" :key="row.key" class="toggle-row">
        <div class="toggle-info">
          <p class="toggle-title">{{ t('notificationSettings', row.labelKey) }}</p>
          <p class="toggle-desc">{{ t('notificationSettings', row.descKey) }}</p>
        </div>
        <button
          class="switch"
          :class="{ on: state[row.key] }"
          :disabled="loading || savingKey === row.key"
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

.error {
  margin: 0 0 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-danger);
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

.switch:disabled {
  opacity: 0.6;
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
