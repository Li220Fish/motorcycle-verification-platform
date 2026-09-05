<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { Bike, Plus, Trash2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VehicleCard from '@/components/common/VehicleCard.vue'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { Vehicle, VehicleDraft } from '@/types/vehicle'

const vehicleStore = useVehicleStore()
const router = useRouter()
const route = useRoute()

// --- Long-press-drag reorder — the top card after a drop is what
// HomeContent.vue's status card features (photo + mileage/fuel stats).
const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10

const draggingId = ref<string | null>(null)
const dragOffsetY = ref(0)
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let dragStartY = 0
let dragMoved = false
let suppressNextClick = false

// Local copy so a live in-progress drag never fights with
// vehicleStore.vehicles updating out from under it; re-synced from the
// store whenever the store's own list changes (fetch, create, delete),
// just not while a drag is actually in flight (draggingId set above it
// so this watcher's `immediate: true` callback can read it right away).
const displayVehicles = ref<Vehicle[]>([])
watch(
  () => vehicleStore.vehicles,
  (list) => {
    if (draggingId.value) return
    displayVehicles.value = [...list]
  },
  { immediate: true },
)

const itemEls = new Map<string, HTMLElement>()
function setItemEl(id: string, el: Element | { $el?: Element } | null): void {
  const node = el && '$el' in el ? el.$el : el
  if (node instanceof HTMLElement) itemEls.set(id, node)
  else itemEls.delete(id)
}

function clearLongPressTimer(): void {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// Snapshot of every card's ORIGINAL position, taken once when a drag
// starts, and never touched again until drop. displayVehicles itself is
// deliberately NOT reordered mid-drag (see itemTransform() below) — moving
// the dragged element to a new v-for slot mid-gesture means Vue actually
// relocates that DOM node, and doing that while it holds active pointer
// capture was observed to silently drop the capture (subsequent pointerup
// landed on the container, not the card, so the drop never persisted).
// Keeping the array frozen during the drag and expressing the live
// preview purely as transforms sidesteps that entirely: the dragged node
// never moves in the DOM until the single splice at drop time, by which
// point the gesture is already over.
interface DragSlot {
  id: string
  centerY: number
}
let dragSlots: DragSlot[] = []
let dragOriginalIndex = -1
const dragTargetIndex = ref(0)
const dragSlotSpacing = ref(0)

function onCardPointerDown(vehicleId: string, event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  clearLongPressTimer()
  dragStartY = event.clientY
  const pointerId = event.pointerId
  const target = event.currentTarget as HTMLElement
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    dragMoved = false
    draggingId.value = vehicleId
    dragOffsetY.value = 0
    dragSlots = displayVehicles.value.map((v) => {
      const rect = itemEls.get(v.id)?.getBoundingClientRect()
      return { id: v.id, centerY: rect ? rect.top + rect.height / 2 : 0 }
    })
    dragOriginalIndex = dragSlots.findIndex((slot) => slot.id === vehicleId)
    dragTargetIndex.value = dragOriginalIndex
    dragSlotSpacing.value =
      dragSlots.length > 1
        ? (dragSlots[dragSlots.length - 1].centerY - dragSlots[0].centerY) / (dragSlots.length - 1)
        : 0
    target.setPointerCapture(pointerId)
    navigator.vibrate?.(15)
  }, LONG_PRESS_MS)
}

function onCardPointerMove(vehicleId: string, event: PointerEvent): void {
  if (longPressTimer !== null) {
    // Still deciding whether this is a long-press — real movement this
    // early means it's a scroll/tap, not a reorder gesture.
    if (Math.abs(event.clientY - dragStartY) > MOVE_CANCEL_PX) clearLongPressTimer()
    return
  }
  if (draggingId.value !== vehicleId) return
  dragMoved = true
  dragOffsetY.value = event.clientY - dragStartY

  const startSlot = dragSlots.find((slot) => slot.id === vehicleId)
  if (!startSlot) return
  const currentCenterY = startSlot.centerY + dragOffsetY.value

  // Which original slot does the card's current center now fall closest
  // to? (Not "which does it not yet cross" — comparing distance-to-center
  // rather than a single top/bottom boundary means the target index is
  // symmetric regardless of whether the card is moving up or down past it.)
  let targetIndex = 0
  let bestDistance = Infinity
  dragSlots.forEach((slot, index) => {
    const distance = Math.abs(currentCenterY - slot.centerY)
    if (distance < bestDistance) {
      bestDistance = distance
      targetIndex = index
    }
  })
  dragTargetIndex.value = targetIndex
}

/** Every card's visual offset during a drag — the dragged card follows the
 * pointer exactly; any card the drop would displace shifts by exactly one
 * slot to preview that; everything else stays put. Purely cosmetic —
 * displayVehicles' actual order only changes once, at drop. */
function itemTransform(vehicleId: string): string | undefined {
  if (!draggingId.value) return undefined
  if (vehicleId === draggingId.value) return `translateY(${dragOffsetY.value}px)`
  const originalIndex = dragSlots.findIndex((slot) => slot.id === vehicleId)
  if (originalIndex === -1) return undefined
  const target = dragTargetIndex.value
  if (dragOriginalIndex < target && originalIndex > dragOriginalIndex && originalIndex <= target) {
    return `translateY(${-dragSlotSpacing.value}px)`
  }
  if (dragOriginalIndex > target && originalIndex < dragOriginalIndex && originalIndex >= target) {
    return `translateY(${dragSlotSpacing.value}px)`
  }
  return undefined
}

async function onCardPointerUp(vehicleId: string): Promise<void> {
  clearLongPressTimer()
  if (draggingId.value !== vehicleId) return
  const wasDrag = dragMoved
  const target = dragTargetIndex.value
  draggingId.value = null
  dragOffsetY.value = 0
  if (!wasDrag) return
  suppressNextClick = true

  if (dragOriginalIndex !== -1 && dragOriginalIndex !== target) {
    const next = [...displayVehicles.value]
    const [moved] = next.splice(dragOriginalIndex, 1)
    next.splice(target, 0, moved)
    displayVehicles.value = next
  }
  await vehicleStore.reorderVehicles(displayVehicles.value.map((v) => v.id))
}

function onCardClick(vehicleId: string): void {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  openVehicle(vehicleId)
}

// Arriving from Vehicle Detail's "新增車輛" menu item (?new=1) already means
// the user wants the form open — no need to click 新增車輛 again.
const showForm = ref(route.query.new === '1')
const submitting = ref(false)

const form = reactive<VehicleDraft>({
  brand: '',
  model: '',
  manufactureYear: null,
  mileage: null,
  licensePlate: '',
  photos: [],
})

async function handleCreate(): Promise<void> {
  submitting.value = true
  try {
    await vehicleStore.createVehicle({ ...form })
    form.brand = ''
    form.model = ''
    form.manufactureYear = null
    form.mileage = null
    form.licensePlate = ''
    showForm.value = false
  } finally {
    submitting.value = false
  }
}

function openVehicle(id: string): void {
  router.push(`/vehicles/${id}`)
}

// Per-card "..." menu — same pattern as VehicleDetailView.vue's own
// top-right menu, just keyed by vehicle id since this view lists many
// cards at once instead of showing a single vehicle.
const openMenuId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

function toggleMenu(vehicleId: string): void {
  openMenuId.value = openMenuId.value === vehicleId ? null : vehicleId
}

async function handleDeleteVehicle(vehicle: Vehicle): Promise<void> {
  openMenuId.value = null
  const label = `${vehicle.brand} ${vehicle.model}`.trim() || '這台車'
  if (!window.confirm(`刪除「${label}」？此操作無法復原。`)) return
  deletingId.value = vehicle.id
  try {
    await vehicleStore.deleteVehicle(vehicle.id)
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  vehicleStore.fetchVehicles()
})
</script>

<template>
  <div>
    <AppHeader title="我的車輛">
      <template #right>
        <button class="icon-button" aria-label="新增車輛" @click="showForm = !showForm">
          <Plus :size="20" />
        </button>
      </template>
    </AppHeader>

    <div class="content">
      <form v-if="showForm" class="vehicle-form" @submit.prevent="handleCreate">
        <input v-model="form.brand" placeholder="廠牌，例如 YAMAHA" required />
        <input v-model="form.model" placeholder="車型，例如 勁戰六代" required />
        <input v-model.number="form.manufactureYear" type="number" placeholder="年式" />
        <input v-model.number="form.mileage" type="number" placeholder="里程 (km)" />
        <input v-model="form.licensePlate" placeholder="車牌號碼" />
        <PrimaryButton type="submit" block :disabled="submitting">
          {{ submitting ? '儲存中...' : '新增車輛' }}
        </PrimaryButton>
      </form>

      <p v-if="vehicleStore.loading">載入中...</p>
      <EmptyState
        v-else-if="vehicleStore.vehicles.length === 0"
        :icon="Bike"
        title="尚未建立車輛"
        description="新增第一台車，開始建立屬於它的驗證紀錄。"
      >
        <template #action>
          <PrimaryButton @click="showForm = true">新增車輛</PrimaryButton>
        </template>
      </EmptyState>
      <template v-else>
        <p v-if="displayVehicles.length > 1" class="reorder-hint">
          長按車輛卡片可拖曳排序，排在最上方的車輛會顯示在首頁封面
        </p>
        <div class="vehicle-list">
          <div
            v-for="vehicle in displayVehicles"
            :key="vehicle.id"
            :ref="(el) => setItemEl(vehicle.id, el)"
            class="vehicle-item"
            :class="{ dragging: draggingId === vehicle.id }"
            :style="{ transform: itemTransform(vehicle.id) }"
            @pointerdown="onCardPointerDown(vehicle.id, $event)"
            @pointermove="onCardPointerMove(vehicle.id, $event)"
            @pointerup="onCardPointerUp(vehicle.id)"
            @pointercancel="onCardPointerUp(vehicle.id)"
          >
            <VehicleCard
              :vehicle="vehicle"
              @click="onCardClick(vehicle.id)"
              @more="toggleMenu(vehicle.id)"
            />
            <div v-if="openMenuId === vehicle.id" class="menu">
              <button
                class="danger"
                :disabled="deletingId === vehicle.id"
                @click="handleDeleteVehicle(vehicle)"
              >
                <Trash2 :size="15" />{{ deletingId === vehicle.id ? '刪除中...' : '刪除車輛' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.vehicle-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.vehicle-form input {
  height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.reorder-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-disabled);
}

.vehicle-item {
  position: relative;
  /* Scrolling stays normal until a long-press actually picks the card up —
     only the active drag needs to own vertical touch gestures. */
  touch-action: pan-y;
  user-select: none;
}

.vehicle-item.dragging {
  z-index: 5;
  touch-action: none;
  transition: none;
  box-shadow: var(--shadow-card);
}

.vehicle-item.dragging :deep(.vehicle-card) {
  box-shadow: 0 14px 28px -10px rgba(0, 0, 0, 0.35);
  transform: scale(1.02);
}

.vehicle-item:not(.dragging) {
  transition: transform 0.15s ease;
}

.menu {
  position: absolute;
  right: var(--space-md);
  top: 100%;
  margin-top: 4px;
  z-index: 10;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 160px;
}

.menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.menu button.danger {
  color: var(--color-danger);
}

.menu button:disabled {
  opacity: 0.6;
}
</style>
