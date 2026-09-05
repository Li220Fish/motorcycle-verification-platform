<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

import MonthCalendar from './MonthCalendar.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'

const props = defineProps<{
  open: boolean
  submitting?: boolean
  /** 'YYYY-MM-DD' dates the seller has opened for viewing. */
  availableDates: string[]
  /** Time-of-day slots (e.g. '10:00') offered on every available date. */
  timeSlots: string[]
  /** Existing appointments' scheduledAt — slots already taken are hidden
   * from whichever date they fall on. */
  bookedTimestamps: number[]
}>()
const emit = defineEmits<{ close: []; submit: [{ scheduledAt: number }] }>()

const selectedDate = ref<string | null>(null)
const selectedTime = ref<string | null>(null)

// Reset each time the sheet reopens, so a previous booking's picks don't
// linger into the next one.
watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedDate.value = null
      selectedTime.value = null
    }
  },
)

function handleSelectDate(date: string): void {
  selectedDate.value = date
  selectedTime.value = null
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const [, month, day] = selectedDate.value.split('-').map(Number)
  return `${month}月${day}日`
})

const bookedTimesForSelectedDate = computed(() => {
  const times = new Set<string>()
  if (!selectedDate.value) return times
  for (const timestamp of props.bookedTimestamps) {
    const date = new Date(timestamp)
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    if (key === selectedDate.value) times.add(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
  }
  return times
})

const availableTimesForDate = computed(() =>
  props.timeSlots.filter((time) => !bookedTimesForSelectedDate.value.has(time)),
)

function handleSubmit(): void {
  if (!selectedDate.value || !selectedTime.value) return
  const scheduledAt = new Date(`${selectedDate.value}T${selectedTime.value}`).getTime()
  emit('submit', { scheduledAt })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="sheet">
        <div class="handle" />
        <div class="sheet-head">
          <h3>選擇賞車時段</h3>
          <button class="close-btn" aria-label="關閉" @click="$emit('close')">
            <X :size="16" />
          </button>
        </div>

        <p v-if="availableDates.length === 0" class="empty-hint">
          賣家尚未開放預約時段，請透過「聊聊」直接詢問賞車時間。
        </p>
        <template v-else>
          <MonthCalendar
            :highlighted-dates="availableDates"
            :selected-date="selectedDate"
            @select-date="handleSelectDate"
          />

          <template v-if="selectedDate">
            <p class="slots-title">{{ formattedSelectedDate }}・可預約時段</p>
            <div v-if="availableTimesForDate.length > 0" class="slot-grid">
              <button
                v-for="time in availableTimesForDate"
                :key="time"
                class="slot-btn"
                :class="{ active: selectedTime === time }"
                @click="selectedTime = time"
              >
                {{ time }}
              </button>
            </div>
            <p v-else class="empty-hint">這天的時段都被預約了，換一天試試。</p>
          </template>

          <PrimaryButton
            block
            :disabled="!selectedDate || !selectedTime || submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '送出中...' : '確認預約' }}
          </PrimaryButton>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}

.sheet {
  width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.handle {
  width: 36px;
  height: 4px;
  border-radius: 99px;
  background: var(--color-border);
  margin: 0 auto 4px;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-head h3 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  background: var(--color-background);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
  margin: var(--space-sm) 0;
}

.slots-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.slot-btn {
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.slot-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
</style>
