<script setup lang="ts">
/**
 * 窗格3：標註窗格 — click-to-place / drag-to-reposition editor for one
 * vehicle model's 基本13項健檢 marker anchors. Mirrors BasicHealthCheck13.vue's
 * own page1/page2 rendering exactly (page 2 = same photo, CSS scaleX(-1))
 * so what the admin sees while placing markers is pixel-for-pixel what the
 * real checklist will show.
 *
 * Coordinate capture is always done against the (untransformed) wrapper
 * element — never against the mirrored <img> itself — exactly like
 * PhotoEvidenceCapture.vue's handleMarkIssue(). Because only the <img> is
 * ever scaleX(-1)'d, never the wrapper or the chip/marker coordinate space,
 * a click captured against the wrapper on page 2 already lands in the same
 * pre-mirrored convention BasicHealthCheck13.vue's runtime chips expect — no
 * extra mirroring math needed here, on either side.
 */
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import type { AdminVehicleModel } from '../services/admin-data.service'
import {
  basicHealthCheckItemsFor,
  type HealthCheckAnchor,
} from '@/data/verification/basic-health-check-items'

const props = defineProps<{ model: AdminVehicleModel }>()
const emit = defineEmits<{
  update: [anchors: Record<string, HealthCheckAnchor>]
  save: [anchors: Record<string, HealthCheckAnchor>]
}>()

const draft = reactive<Record<string, HealthCheckAnchor>>({})
const currentPage = ref<1 | 2>(1)
const activeItemKey = ref<string | null>(null)
const photoWrapEl = ref<HTMLElement | null>(null)
const draggingKey = ref<string | null>(null)
const saving = ref(false)
const savedFlash = ref(false)

const items = computed(() => basicHealthCheckItemsFor(props.model.hasChain))
const pageItems = computed(() =>
  items.value.filter((it) => draft[it.key]?.page === currentPage.value),
)
const isMirrored = computed(() => currentPage.value === 2)

function resetDraftFromModel(): void {
  const source = props.model.healthCheckAnchors ?? {}
  Object.keys(draft).forEach((key) => delete draft[key])
  Object.assign(draft, JSON.parse(JSON.stringify(source)))
  activeItemKey.value = null
  currentPage.value = 1
  emit('update', { ...draft })
}

watch(() => props.model.id, resetDraftFromModel, { immediate: true })

function emitUpdate(): void {
  emit('update', { ...draft })
}

function selectItem(key: string): void {
  activeItemKey.value = key
  const existing = draft[key]
  if (existing) currentPage.value = existing.page
}

function photoToPercent(event: MouseEvent, el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return {
    x: Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(1)),
    y: Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(1)),
  }
}

function handlePhotoClick(event: MouseEvent): void {
  if (!activeItemKey.value) return
  const target = event.currentTarget as HTMLElement
  const { x, y } = photoToPercent(event, target)
  draft[activeItemKey.value] = { x, y, page: currentPage.value }
  emitUpdate()
}

function startDrag(key: string, event: MouseEvent): void {
  event.stopPropagation()
  activeItemKey.value = key
  draggingKey.value = key
  window.addEventListener('mousemove', handleDragMove)
  window.addEventListener('mouseup', endDrag)
}

function handleDragMove(event: MouseEvent): void {
  if (!draggingKey.value || !photoWrapEl.value) return
  const { x, y } = photoToPercent(event, photoWrapEl.value)
  draft[draggingKey.value] = { x, y, page: currentPage.value }
  emitUpdate()
}

function endDrag(): void {
  draggingKey.value = null
  window.removeEventListener('mousemove', handleDragMove)
  window.removeEventListener('mouseup', endDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleDragMove)
  window.removeEventListener('mouseup', endDrag)
})

function seedCenter(key: string): void {
  draft[key] = { x: 50, y: 50, page: currentPage.value }
  emitUpdate()
}

function removeAnchor(key: string): void {
  delete draft[key]
  emitUpdate()
}

function updateNumeric(key: string, axis: 'x' | 'y', value: string): void {
  const num = Number(value)
  if (Number.isNaN(num)) return
  const clamped = Math.min(100, Math.max(0, num))
  const current = draft[key] ?? { x: 50, y: 50, page: currentPage.value }
  draft[key] = { ...current, [axis]: clamped }
  emitUpdate()
}

const placedCount = computed(() => items.value.filter((it) => draft[it.key]).length)

async function handleSave(): Promise<void> {
  saving.value = true
  try {
    emit('save', { ...draft })
    savedFlash.value = true
    setTimeout(() => (savedFlash.value = false), 2000)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="editor">
    <div class="editor-side">
      <p class="editor-count">已標記 {{ placedCount }} / {{ items.length }}</p>
      <div class="item-list">
        <button
          v-for="it in items"
          :key="it.key"
          type="button"
          class="item-row"
          :class="{ active: activeItemKey === it.key, placed: !!draft[it.key] }"
          @click="selectItem(it.key)"
        >
          <span class="item-label">{{ it.label }}</span>
          <span v-if="it.required" class="admin-pill attn">必填</span>
          <span v-if="draft[it.key]" class="admin-pill ok">第{{ draft[it.key].page }}頁</span>
          <span v-else class="admin-pill mute">尚未標記</span>
        </button>
      </div>

      <div v-if="activeItemKey" class="active-panel">
        <p class="active-title">{{ items.find((i) => i.key === activeItemKey)?.label }}</p>
        <template v-if="draft[activeItemKey]">
          <label class="admin-field">
            <span>X (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              :value="draft[activeItemKey].x"
              @input="updateNumeric(activeItemKey!, 'x', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="admin-field">
            <span>Y (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              :value="draft[activeItemKey].y"
              @input="updateNumeric(activeItemKey!, 'y', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <button class="admin-btn sm danger" @click="removeAnchor(activeItemKey!)">
            移除標記
          </button>
        </template>
        <button v-else class="admin-btn sm primary" @click="seedCenter(activeItemKey!)">
          在第{{ currentPage }}頁置中放置（可再拖曳調整）
        </button>
        <p class="hint">或直接點擊右側照片上的位置來放置這個項目。</p>
      </div>
      <p v-else class="hint">先點選左側一個項目，再點擊照片放置標記，或拖曳既有標記調整位置。</p>

      <button class="admin-btn primary save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? '儲存中...' : '儲存標記' }}
      </button>
      <p v-if="savedFlash" class="saved-flash">已儲存 ✓</p>
    </div>

    <div class="editor-main">
      <div class="page-toggle">
        <button
          class="admin-btn sm"
          :class="{ primary: currentPage === 1 }"
          @click="currentPage = 1"
        >
          第1頁（前3/4視角）
        </button>
        <button
          class="admin-btn sm"
          :class="{ primary: currentPage === 2 }"
          @click="currentPage = 2"
        >
          第2頁（鏡射視角）
        </button>
      </div>

      <div
        v-if="model.coverImageUrl"
        ref="photoWrapEl"
        class="photo-wrap"
        :class="{ mirrored: isMirrored, placing: !!activeItemKey }"
        @click="handlePhotoClick"
      >
        <img :src="model.coverImageUrl" class="photo-img" alt="範例圖片" />
        <button
          v-for="it in pageItems"
          :key="it.key"
          type="button"
          class="marker"
          :class="{ active: activeItemKey === it.key }"
          :style="{ left: draft[it.key].x + '%', top: draft[it.key].y + '%' }"
          @mousedown="startDrag(it.key, $event)"
          @click.stop
        >
          {{ it.label }}
        </button>
      </div>
      <div v-else class="no-photo">
        此車款尚未上傳範例圖片，請先於下方「批次上傳範例圖片」或「車輛選單資訊」新增。
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
}

.editor-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-count {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
  margin: 0;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 12.5px;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1px solid var(--line-soft);
  background: var(--surface);
  cursor: pointer;
  text-align: left;
}

.item-row.active {
  border-color: var(--action);
  background: var(--action-soft);
}

.item-label {
  flex: 1;
  font-weight: 600;
}

.active-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f7f9fc;
}

.active-title {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.hint {
  font-size: 11.5px;
  color: var(--faint);
  margin: 0;
}

.save-btn {
  margin-top: 8px;
}

.saved-flash {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ok);
  text-align: center;
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page-toggle {
  display: flex;
  gap: 8px;
}

.photo-wrap {
  position: relative;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1 / 1.19;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: #eef1f5;
  cursor: crosshair;
}

.photo-wrap.placing {
  cursor: copy;
}

.photo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.photo-wrap.mirrored .photo-img {
  transform: scaleX(-1);
}

.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  font: inherit;
  font-size: 10.5px;
  font-weight: 800;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1.5px solid var(--action);
  background: #fff;
  color: var(--action);
  cursor: grab;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(20, 24, 31, 0.25);
}

.marker.active {
  background: var(--action);
  color: #fff;
}

.marker:active {
  cursor: grabbing;
}

.no-photo {
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 40px 20px;
  text-align: center;
  color: var(--faint);
  font-size: 13px;
}
</style>
