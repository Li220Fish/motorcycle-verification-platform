<script setup lang="ts">
/**
 * Oriented-box (YOLO26-OBB) editor for one training capture. Starts from
 * the saved annotations, or — for a never-reviewed photo — from the guide
 * frames the collector aligned the part to at capture time, so most photos
 * only need a nudge before 核准.
 *
 * All geometry is handled in image PIXEL space (the SVG viewBox is the
 * image's own width × height), matching ObbBox's contract that rotation
 * happens in pixel space.
 *
 * Mouse: drag on empty photo = new box (current label); drag a box = move;
 * drag a corner = resize (in the box's own rotated frame); drag the top
 * knob = rotate. Keys: Q W E R T / A S D F G / Z X C = label (applies to the
 * selected box too), [ ] rotate ±5° (Shift ±1°), Delete remove, Esc
 * deselect, Enter = 核准並下一張, ← → = previous / next photo.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  obbCorners,
  VEHICLE_TYPE_LABEL,
  type ObbBox,
  type TrainingAnnotation,
  type TrainingCapture,
  type TrainingCaptureStatus,
} from '@/data/training/training-dataset.types'
import {
  findTrainingShot,
  guessVehicleType,
  partLabel,
  TRAINING_PART_LABELS,
} from '@/data/training/training-shots'
import type { VehicleClassification } from '../services/training-dataset.service'

export interface CatalogOption {
  id: string
  label: string
  bodyType: string | null
  hasChain: boolean
}

const props = defineProps<{
  capture: TrainingCapture
  imageUrl: string | null
  models: CatalogOption[]
}>()
const emit = defineEmits<{
  reclassify: [vehicle: VehicleClassification, wholeSession: boolean]
  save: [
    annotations: TrainingAnnotation[],
    status: TrainingCaptureStatus,
    rejectReason: string | null,
  ]
  prev: []
  next: []
}>()

const KEYS = 'qwertasdfgzxcvb'
const COLORS = ['#e0574a', '#2f8fd8', '#2fa66b', '#c46ad6', '#e3a21a', '#16a8a8']
const color = (label: string) =>
  COLORS[
    Math.max(
      0,
      TRAINING_PART_LABELS.findIndex((p) => p.key === label),
    ) % COLORS.length
  ]

const W = computed(() => props.capture.width || 3)
const H = computed(() => props.capture.height || 4)

const draft = ref<TrainingAnnotation[]>([])
const selected = ref(-1)
const activeLabel = ref(props.capture.partKey)
const rejectReason = ref('')
const dirty = ref(false)

function reset(fromGuides = false): void {
  const src =
    !fromGuides && props.capture.annotations
      ? props.capture.annotations
      : props.capture.guideAnnotations
  draft.value = JSON.parse(JSON.stringify(src))
  selected.value = draft.value.length ? 0 : -1
  activeLabel.value = props.capture.partKey
  rejectReason.value = props.capture.rejectReason ?? ''
  dirty.value = fromGuides
}
watch(
  () => props.capture.id,
  () => reset(),
  { immediate: true },
)

const polys = computed(() =>
  draft.value.map((a, i) => {
    const pts = obbCorners(a.box, W.value, H.value)
    const [tl, tr] = pts
    const topMid: [number, number] = [(tl[0] + tr[0]) / 2, (tl[1] + tr[1]) / 2]
    const r = (a.box.angle * Math.PI) / 180
    const knobDist = Math.min(W.value, H.value) * 0.05
    const knob: [number, number] = [
      topMid[0] + Math.sin(r) * knobDist,
      topMid[1] - Math.cos(r) * knobDist,
    ]
    return {
      i,
      label: a.label,
      pts,
      points: pts.map((p) => p.join(',')).join(' '),
      topMid,
      knob,
      color: color(a.label),
    }
  }),
)

const stroke = computed(() => Math.max(W.value, H.value) / 400)

// --- pointer interaction ---

const svgEl = ref<SVGSVGElement | null>(null)
type Drag =
  | { kind: 'draw'; x0: number; y0: number }
  | { kind: 'move'; i: number; x0: number; y0: number; orig: ObbBox }
  | { kind: 'resize'; i: number; corner: number; orig: ObbBox }
  | { kind: 'rotate'; i: number }
let drag: Drag | null = null
const ghost = ref<ObbBox | null>(null)

function toPx(e: PointerEvent): [number, number] {
  const rect = svgEl.value!.getBoundingClientRect()
  return [
    ((e.clientX - rect.left) / rect.width) * W.value,
    ((e.clientY - rect.top) / rect.height) * H.value,
  ]
}

function onDown(e: PointerEvent, kind: 'bg' | 'box' | 'corner' | 'knob', i = -1, corner = 0): void {
  e.stopPropagation()
  e.preventDefault()
  const [x, y] = toPx(e)
  if (kind === 'bg') {
    drag = { kind: 'draw', x0: x, y0: y }
    selected.value = -1
  } else if (kind === 'box') {
    selected.value = i
    activeLabel.value = draft.value[i].label
    drag = { kind: 'move', i, x0: x, y0: y, orig: { ...draft.value[i].box } }
  } else if (kind === 'corner') {
    drag = { kind: 'resize', i, corner, orig: { ...draft.value[i].box } }
  } else {
    drag = { kind: 'rotate', i }
  }
  svgEl.value!.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent): void {
  if (!drag) return
  const [x, y] = toPx(e)
  const Wv = W.value
  const Hv = H.value
  if (drag.kind === 'draw') {
    const x0 = Math.min(drag.x0, x)
    const y0 = Math.min(drag.y0, y)
    ghost.value = {
      cx: (x0 + Math.abs(x - drag.x0) / 2) / Wv,
      cy: (y0 + Math.abs(y - drag.y0) / 2) / Hv,
      w: Math.abs(x - drag.x0) / Wv,
      h: Math.abs(y - drag.y0) / Hv,
      angle: 0,
    }
    return
  }
  const box = draft.value[drag.i].box
  if (drag.kind === 'move') {
    box.cx = drag.orig.cx + (x - drag.x0) / Wv
    box.cy = drag.orig.cy + (y - drag.y0) / Hv
  } else if (drag.kind === 'rotate') {
    const cx = box.cx * Wv
    const cy = box.cy * Hv
    let a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90
    if (e.shiftKey) a = Math.round(a / 15) * 15
    box.angle = Math.round(((a + 540) % 360) - 180)
  } else {
    // Resize in the box's rotated frame, opposite corner pinned.
    const o = drag.orig
    const r = (o.angle * Math.PI) / 180
    const cos = Math.cos(r)
    const sin = Math.sin(r)
    const ocx = o.cx * Wv
    const ocy = o.cy * Hv
    const toLocal = (px: number, py: number): [number, number] => {
      const dx = px - ocx
      const dy = py - ocy
      return [dx * cos + dy * sin, -dx * sin + dy * cos]
    }
    const signs: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]
    const [sx, sy] = signs[drag.corner]
    const opp: [number, number] = [(-sx * o.w * Wv) / 2, (-sy * o.h * Hv) / 2]
    const p = toLocal(x, y)
    const mid: [number, number] = [(p[0] + opp[0]) / 2, (p[1] + opp[1]) / 2]
    box.w = Math.max(4, Math.abs(p[0] - opp[0])) / Wv
    box.h = Math.max(4, Math.abs(p[1] - opp[1])) / Hv
    box.cx = (ocx + mid[0] * cos - mid[1] * sin) / Wv
    box.cy = (ocy + mid[0] * sin + mid[1] * cos) / Hv
  }
  dirty.value = true
}

function onUp(): void {
  if (drag?.kind === 'draw' && ghost.value && ghost.value.w > 0.02 && ghost.value.h > 0.02) {
    draft.value.push({ label: activeLabel.value, box: ghost.value })
    selected.value = draft.value.length - 1
    dirty.value = true
  }
  ghost.value = null
  drag = null
}

const ghostPoints = computed(() =>
  ghost.value
    ? obbCorners(ghost.value, W.value, H.value)
        .map((p) => p.join(','))
        .join(' ')
    : '',
)

// --- edits ---

function setLabel(key: string): void {
  activeLabel.value = key
  if (selected.value >= 0) {
    draft.value[selected.value].label = key
    dirty.value = true
  }
}

function removeSelected(): void {
  if (selected.value < 0) return
  draft.value.splice(selected.value, 1)
  selected.value = Math.min(selected.value, draft.value.length - 1)
  dirty.value = true
}

function rotateSelected(delta: number): void {
  if (selected.value < 0) return
  const b = draft.value[selected.value].box
  b.angle = Math.round(((b.angle + delta + 540) % 360) - 180)
  dirty.value = true
}

// --- 車款分類 (catalog = 車輛選單資訊 / vehicleModels) ---

const vehicleSearch = ref('')
const vehicleSearchEl = ref<HTMLInputElement | null>(null)
const vehicleTypeDraft = ref(props.capture.vehicleType)
const wholeSession = ref(true)
watch(
  () => props.capture.id,
  () => {
    vehicleSearch.value = ''
    vehicleTypeDraft.value = props.capture.vehicleType
  },
)
const vehicleMatches = computed(() => {
  const q = vehicleSearch.value.trim().toLowerCase()
  if (!q) return []
  return props.models.filter((m) => m.label.toLowerCase().includes(q)).slice(0, 8)
})

function pickModel(m: CatalogOption): void {
  vehicleTypeDraft.value = guessVehicleType(m.bodyType, m.hasChain)
  emit(
    'reclassify',
    { vehicleModelId: m.id, vehicleModelLabel: m.label, vehicleType: vehicleTypeDraft.value },
    wholeSession.value,
  )
  vehicleSearch.value = ''
  vehicleSearchEl.value?.blur()
}

function setVehicleType(t: 'scooter' | 'manual'): void {
  vehicleTypeDraft.value = t
  emit(
    'reclassify',
    {
      vehicleModelId: props.capture.vehicleModelId,
      vehicleModelLabel: props.capture.vehicleModelLabel,
      vehicleType: t,
    },
    wholeSession.value,
  )
}

function onVehicleKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && vehicleMatches.value[0]) {
    e.preventDefault()
    pickModel(vehicleMatches.value[0])
  } else if (e.key === 'Escape') {
    vehicleSearch.value = ''
    vehicleSearchEl.value?.blur()
  }
}

function save(status: TrainingCaptureStatus): void {
  if (status === 'rejected' && !rejectReason.value.trim()) {
    rejectReason.value = '品質不佳'
  }
  emit(
    'save',
    JSON.parse(JSON.stringify(draft.value)),
    status,
    status === 'rejected' ? rejectReason.value.trim() : null,
  )
  dirty.value = false
}

function onKey(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
  if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement)?.tagName ?? '')) return
  const k = e.key.toLowerCase()
  const idx = KEYS.indexOf(k)
  if (k.length === 1 && idx >= 0 && idx < TRAINING_PART_LABELS.length) {
    e.preventDefault()
    setLabel(TRAINING_PART_LABELS[idx].key)
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    removeSelected()
  } else if (k === 'v') {
    e.preventDefault()
    vehicleSearchEl.value?.focus()
  } else if (e.key === 'Escape') {
    selected.value = -1
  } else if (e.key === '[' || e.key === ']') {
    rotateSelected((e.key === '[' ? -1 : 1) * (e.shiftKey ? 1 : 5))
  } else if (e.key === 'Enter') {
    e.preventDefault()
    save('approved')
    emit('next')
  } else if (e.key === 'ArrowLeft') {
    emit('prev')
  } else if (e.key === 'ArrowRight') {
    emit('next')
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const shot = computed(() => findTrainingShot(props.capture.shotId))
const fmtDate = (ms: number) => (ms ? new Date(ms).toLocaleString('zh-TW', { hour12: false }) : '—')
</script>

<template>
  <div class="ed">
    <div class="ed-main">
      <div class="meta">
        <span
          ><b>{{ capture.vehicleModelLabel || '未分類' }}</b
          >（{{ VEHICLE_TYPE_LABEL[capture.vehicleType] }}）</span
        >
        <span>{{ shot?.title ?? capture.shotId }}</span>
        <span>拍攝 {{ fmtDate(capture.capturedAt) }}</span>
        <span class="mono">{{ capture.width }}×{{ capture.height }}</span>
        <span
          class="admin-pill"
          :class="{
            ok: capture.status === 'approved',
            risk: capture.status === 'rejected',
            mute: capture.status === 'pending',
          }"
        >
          {{ { pending: '待審', approved: '已核准', rejected: '已退回' }[capture.status] }}
        </span>
        <span v-if="dirty" class="admin-pill attn">未儲存</span>
      </div>

      <div class="stage" :style="{ aspectRatio: `${W} / ${H}` }">
        <img v-if="imageUrl" :src="imageUrl" alt="" draggable="false" />
        <svg
          ref="svgEl"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="none"
          @pointerdown="onDown($event, 'bg')"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
        >
          <g v-for="p in polys" :key="p.i" :class="{ sel: p.i === selected }">
            <polygon
              :points="p.points"
              :style="{ stroke: p.color, fill: p.color }"
              :stroke-width="stroke * (p.i === selected ? 3 : 2)"
              class="poly"
              @pointerdown="onDown($event, 'box', p.i)"
            />
            <text
              :x="p.pts[0][0]"
              :y="p.pts[0][1] - stroke * 6"
              :font-size="stroke * 14"
              :fill="p.color"
              class="lbl"
            >
              {{ partLabel(p.label) }}
            </text>
            <template v-if="p.i === selected">
              <line
                :x1="p.topMid[0]"
                :y1="p.topMid[1]"
                :x2="p.knob[0]"
                :y2="p.knob[1]"
                :stroke="p.color"
                :stroke-width="stroke * 2"
              />
              <circle
                :cx="p.knob[0]"
                :cy="p.knob[1]"
                :r="stroke * 7"
                :fill="p.color"
                class="knob"
                @pointerdown="onDown($event, 'knob', p.i)"
              />
              <rect
                v-for="(pt, ci) in p.pts"
                :key="ci"
                :x="pt[0] - stroke * 6"
                :y="pt[1] - stroke * 6"
                :width="stroke * 12"
                :height="stroke * 12"
                fill="#fff"
                :stroke="p.color"
                :stroke-width="stroke * 2"
                class="corner"
                @pointerdown="onDown($event, 'corner', p.i, ci)"
              />
            </template>
          </g>
          <polygon v-if="ghost" :points="ghostPoints" class="ghost" :stroke-width="stroke * 2" />
        </svg>
      </div>
      <p class="tip">
        在照片上拖曳畫框；拖曳框身移動、拖四角縮放、拖上方圓點旋轉（Shift 對齊 15°）。
        <kbd>[</kbd><kbd>]</kbd> 旋轉 5°，<kbd>Enter</kbd> 核准並下一張，<kbd>←</kbd
        ><kbd>→</kbd> 切換照片。
      </p>
    </div>

    <aside class="ed-side">
      <div>
        <h4>部件類別</h4>
        <div class="classes">
          <button
            v-for="(c, i) in TRAINING_PART_LABELS"
            :key="c.key"
            type="button"
            class="cls"
            :class="{ on: activeLabel === c.key }"
            :style="{ '--bc': COLORS[i % COLORS.length] }"
            :title="`按 ${KEYS[i].toUpperCase()}`"
            @click="setLabel(c.key)"
          >
            <kbd>{{ KEYS[i].toUpperCase() }}</kbd
            >{{ c.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="row">
          <h4>此張標注框（{{ draft.length }}）</h4>
          <button class="admin-btn sm danger" :disabled="selected < 0" @click="removeSelected">
            刪除
          </button>
        </div>
        <div class="blist">
          <button
            v-for="(a, i) in draft"
            :key="i"
            type="button"
            class="bi"
            :class="{ sel: i === selected }"
            :style="{ '--bc': color(a.label) }"
            @click="((selected = i), (activeLabel = a.label))"
          >
            <i></i>
            <span>{{ partLabel(a.label) }}</span>
            <span class="mono">{{ a.box.angle }}°</span>
          </button>
          <p v-if="!draft.length" class="dim">尚無標注框，在照片上拖曳畫出第一個。</p>
        </div>
        <label v-if="selected >= 0" class="admin-field">
          <span>角度（°）</span>
          <input
            type="number"
            step="1"
            :value="draft[selected].box.angle"
            @input="
              ((draft[selected].box.angle = Number(($event.target as HTMLInputElement).value) || 0),
              (dirty = true))
            "
          />
        </label>
        <button class="admin-btn sm" @click="reset(true)">重設為拍攝引導框</button>
      </div>

      <div>
        <h4>車款分類 <kbd>V</kbd></h4>
        <p class="vcur">
          <b>{{ capture.vehicleModelLabel || '未分類' }}</b>
          <span v-if="!capture.vehicleModelId" class="admin-pill attn">{{
            capture.vehicleModelLabel ? '不在車輛選單' : '按 V 分類'
          }}</span>
        </p>
        <input
          ref="vehicleSearchEl"
          v-model="vehicleSearch"
          class="admin-search vsearch"
          type="search"
          placeholder="搜尋車輛選單改分類（Enter 選第一筆）"
          @keydown="onVehicleKey"
        />
        <div v-if="vehicleMatches.length" class="vmatches">
          <button v-for="m in vehicleMatches" :key="m.id" type="button" @click="pickModel(m)">
            {{ m.label }}
          </button>
        </div>
        <div class="vtype">
          <button
            v-for="t in ['scooter', 'manual'] as const"
            :key="t"
            type="button"
            class="admin-btn sm"
            :class="{ primary: vehicleTypeDraft === t }"
            @click="setVehicleType(t)"
          >
            {{ VEHICLE_TYPE_LABEL[t] }}
          </button>
        </div>
        <label class="vall"
          ><input v-model="wholeSession" type="checkbox" /> 套用到同一台車的所有照片</label
        >
      </div>

      <div>
        <h4>拍攝品質</h4>
        <dl class="q">
          <dt>亮度</dt>
          <dd>{{ capture.quality.brightness }}</dd>
          <dt>清晰度</dt>
          <dd>{{ capture.quality.sharpness }}</dd>
          <dt>水平</dt>
          <dd>{{ capture.quality.rollDeg ?? '—' }}°</dd>
        </dl>
        <p v-if="capture.quality.warnings.length" class="warn">
          拍攝時警示：{{ capture.quality.warnings.join('、') }}
        </p>
      </div>

      <div class="actions">
        <button class="admin-btn primary" @click="(save('approved'), emit('next'))">
          核准並下一張
        </button>
        <button
          class="admin-btn"
          @click="save(capture.status === 'approved' ? 'approved' : 'pending')"
        >
          僅儲存
        </button>
        <div class="reject">
          <select v-model="rejectReason" class="admin-btn sm">
            <option value="">退回原因…</option>
            <option>模糊</option>
            <option>部件未入框</option>
            <option>拍錯部位</option>
            <option>過暗或過曝</option>
            <option>遮擋嚴重</option>
          </select>
          <button class="admin-btn sm danger" @click="(save('rejected'), emit('next'))">
            退回
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.ed {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}

.ed-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.meta {
  align-self: stretch;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12.5px;
  color: var(--muted);
  align-items: center;
}

.meta b {
  color: var(--text);
}

.stage {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 72vh;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  user-select: none;
}

.stage img,
.stage svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.stage img {
  object-fit: cover;
  pointer-events: none;
}

.stage svg {
  cursor: crosshair;
  touch-action: none;
}

.poly {
  fill-opacity: 0.1;
  cursor: move;
}

.sel .poly {
  fill-opacity: 0.18;
}

.lbl {
  font-weight: 700;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 3px;
  pointer-events: none;
}

.corner {
  cursor: nwse-resize;
}

.knob {
  cursor: grab;
}

.ghost {
  fill: rgba(255, 255, 255, 0.1);
  stroke: #fff;
  stroke-dasharray: 8 6;
  pointer-events: none;
}

.tip {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  text-align: center;
}

kbd {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  padding: 0 4px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--surface);
}

.ed-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ed-side h4 {
  margin: 0 0 6px;
  font-size: 13px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.classes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.cls {
  display: flex;
  align-items: center;
  gap: 5px;
  font: inherit;
  font-size: 12px;
  padding: 5px 6px;
  border-radius: 6px;
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--bc);
  background: var(--surface);
  cursor: pointer;
  text-align: left;
}

.cls.on {
  border-color: var(--bc);
  box-shadow: inset 0 0 0 1px var(--bc);
  font-weight: 700;
}

.cls.on kbd {
  background: var(--bc);
  border-color: var(--bc);
  color: #fff;
}

.blist {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.bi {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  gap: 6px;
  align-items: center;
  font: inherit;
  font-size: 12.5px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: var(--ground);
  cursor: pointer;
  text-align: left;
}

.bi i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--bc);
}

.bi.sel {
  border-color: var(--action);
}

.mono {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: var(--muted);
}

.dim {
  color: var(--faint);
  font-size: 12px;
  margin: 0;
}

.q {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 12px;
  font-size: 12.5px;
  margin: 0;
}

.q dt {
  color: var(--muted);
}

.q dd {
  margin: 0;
}

.warn {
  font-size: 12px;
  color: var(--attention);
  margin: 6px 0 0;
}

.vcur {
  margin: 0 0 6px;
  font-size: 13px;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.vsearch {
  width: 100%;
}

.vmatches {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 6px;
  margin-top: 4px;
  overflow: hidden;
}

.vmatches button {
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  padding: 6px 8px;
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  background: var(--surface);
  cursor: pointer;
}

.vmatches button:hover {
  background: var(--action-soft);
}

.vtype {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.vall {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reject {
  display: flex;
  gap: 6px;
}

.reject select {
  flex: 1;
}

@media (max-width: 1100px) {
  .ed {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
