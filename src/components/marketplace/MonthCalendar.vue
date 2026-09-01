<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  /** 'YYYY-MM-DD' dates to render highlighted (available). */
  highlightedDates: string[]
  selectedDate?: string | null
}>()
const emit = defineEmits<{ selectDate: [string] }>()

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

const highlightedSet = computed(() => new Set(props.highlightedDates))

interface DayCell {
  day: number
  key: string
}

const calendarCells = computed<(DayCell | null)[]>(() => {
  const firstWeekday = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells: (DayCell | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: toKey(viewYear.value, viewMonth.value, day) })
  }
  return cells
})

function isPast(key: string): boolean {
  return key < todayKey
}

function handlePrevMonth(): void {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function handleNextMonth(): void {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-head">
      <button class="nav-btn" aria-label="上個月" @click="handlePrevMonth">
        <ChevronLeft :size="18" />
      </button>
      <span class="month-label">{{ viewYear }}年 {{ viewMonth + 1 }}月</span>
      <button class="nav-btn" aria-label="下個月" @click="handleNextMonth">
        <ChevronRight :size="18" />
      </button>
    </div>

    <div class="weekday-row">
      <span v-for="label in WEEKDAY_LABELS" :key="label">{{ label }}</span>
    </div>

    <div class="day-grid">
      <template v-for="(cell, index) in calendarCells" :key="index">
        <span v-if="!cell" class="day-cell empty" />
        <button
          v-else
          class="day-cell"
          :class="{
            highlighted: highlightedSet.has(cell.key),
            selected: selectedDate === cell.key,
            past: isPast(cell.key),
          }"
          :disabled="isPast(cell.key)"
          @click="emit('selectDate', cell.key)"
        >
          {{ cell.day }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.calendar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-label {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.nav-btn {
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

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-disabled);
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-cell.empty {
  visibility: hidden;
}

.day-cell.past {
  color: var(--color-text-disabled);
}

.day-cell.past:not(.highlighted) {
  opacity: 0.4;
}

.day-cell.highlighted {
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  font-weight: 700;
}

.day-cell.selected {
  background: var(--color-primary);
  color: #fff;
}
</style>
