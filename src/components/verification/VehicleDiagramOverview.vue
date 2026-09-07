<script setup lang="ts">
/**
 * Whole-vehicle visual status map for the 檢驗報告 screen — a side-view
 * motorcycle illustration with a colored dot over each labeled part, so a
 * viewer can see at a glance where the trouble spots are. Tapping a dot pops
 * up a small white label with that part's name, and tells the parent
 * (InspectionReportBody.vue) which real item ids it stands for so the
 * matching category section down in the list can expand and scroll into
 * view — this diagram is a map INTO that list, not a replacement for it.
 *
 * Several dots intentionally roll up MULTIPLE real checklist items into one
 * status (e.g. 引擎 covers ENG-01..08 + APR-engine-bottom; 前大燈 covers
 * ELEC-01/02/03) — the caller (VerificationReportView.vue) resolves that
 * worst-of-N logic; this component only ever renders whatever tone/label
 * it's handed, same division of labor as ReportItem/ReportSection already
 * used by InspectionReportBody.
 */
import { computed, ref } from 'vue'

export type DiagramTone = 'success' | 'warning' | 'neutral' | 'danger' | 'primary'

export interface DiagramMarker {
  key: string
  label: string
  /** [x%, y%] position on the illustration's bounding box. */
  anchor: [number, number]
  badgeLabel: string
  tone: DiagramTone
  /** Real checklist item ids this dot's status was rolled up from — handed
   *  back via `selectItems` so the parent knows what to expand/scroll to. */
  itemIds: string[]
}

const props = defineProps<{ markers: DiagramMarker[] }>()
const emit = defineEmits<{ selectItems: [itemIds: string[]] }>()

const activeMarkerKey = ref<string | null>(null)
const activeMarker = computed(() =>
  props.markers.find((marker) => marker.key === activeMarkerKey.value),
)

function handleMarkerClick(marker: DiagramMarker): void {
  activeMarkerKey.value = activeMarkerKey.value === marker.key ? null : marker.key
  emit('selectItems', marker.itemIds)
}

const TONE_COLOR: Record<DiagramTone, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-text-secondary)',
  primary: 'var(--color-primary)',
}

function colorFor(tone: DiagramTone): string {
  return TONE_COLOR[tone]
}

// Rolls the underlying per-item labels (正常/須注意/不確定/不適用/未檢查) up into
// the same 3 buckets the legend row shows — 須注意/不確定 both read as "需留意"
// at a glance, same for 不適用/未檢查 both reading as "尚未確認".
const STAT_GROUPS: { key: string; label: string; tones: DiagramTone[] }[] = [
  { key: 'good', label: '良好', tones: ['success'] },
  { key: 'attention', label: '需留意', tones: ['warning', 'danger'] },
  { key: 'unchecked', label: '尚未確認', tones: ['neutral', 'primary'] },
]

const statCounts = computed(() =>
  STAT_GROUPS.map((group) => ({
    ...group,
    count: props.markers.filter((marker) => group.tones.includes(marker.tone)).length,
  })),
)
</script>

<template>
  <div v-if="markers.length > 0" class="diagram-card">
    <div class="diagram-stage">
      <svg class="bike-illustration" viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="350" cy="378" rx="270" ry="12" fill="#000" opacity="0.06" />
        <circle cx="555" cy="300" r="72" fill="#1B2438" />
        <circle cx="555" cy="300" r="72" fill="none" stroke="#3A4356" stroke-width="3" />
        <circle cx="555" cy="300" r="46" fill="none" stroke="#5B6478" stroke-width="6" />
        <circle cx="555" cy="300" r="14" fill="#5B6478" />
        <circle cx="150" cy="300" r="72" fill="#1B2438" />
        <circle cx="150" cy="300" r="72" fill="none" stroke="#3A4356" stroke-width="3" />
        <circle cx="150" cy="300" r="46" fill="none" stroke="#5B6478" stroke-width="6" />
        <circle cx="150" cy="300" r="14" fill="#5B6478" />
        <circle
          cx="150"
          cy="300"
          r="58"
          fill="none"
          stroke="#8A93A6"
          stroke-width="2"
          stroke-dasharray="2 6"
          opacity="0.6"
        />
        <path d="M 360 275 L 545 292 L 545 305 L 360 292 Z" fill="#4B5468" />
        <path d="M 150 300 L 224 158 L 240 162 L 168 305 Z" fill="#3A4356" />
        <path d="M 330 300 Q 430 320 520 312 L 520 328 Q 420 336 328 314 Z" fill="#7A8296" />
        <rect x="270" y="228" width="150" height="88" rx="16" fill="#4B5468" />
        <circle cx="345" cy="272" r="26" fill="#3A4356" />
        <rect x="290" y="215" width="40" height="20" rx="4" fill="#3A4356" />
        <path
          d="M 232 168 L 300 232 L 420 236 L 470 190"
          fill="none"
          stroke="#2A3242"
          stroke-width="10"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M 224 160 C 210 190 218 220 260 228 C 310 236 360 224 384 200 C 400 182 392 158 360 150 C 320 140 260 138 224 160 Z"
          fill="#5B6478"
        />
        <path
          d="M 356 200 C 390 182 440 176 480 184 C 500 188 512 196 508 206 C 504 214 488 212 476 216 L 368 222 C 356 220 348 208 356 200 Z"
          fill="#2A3242"
        />
        <rect x="498" y="192" width="9" height="13" rx="3" fill="#8A93A6" />
        <circle cx="222" cy="170" r="18" fill="#3A4356" />
        <circle cx="222" cy="170" r="10" fill="#8A93A6" />
        <path d="M 224 152 L 268 140" stroke="#2A3242" stroke-width="8" stroke-linecap="round" />
        <line
          x1="240"
          y1="146"
          x2="236"
          y2="120"
          stroke="#2A3242"
          stroke-width="5"
          stroke-linecap="round"
        />
        <ellipse cx="234" cy="114" rx="9" ry="6" fill="#3A4356" />
        <ellipse cx="196" cy="182" rx="7" ry="5" fill="#8A93A6" />
      </svg>

      <button
        v-for="marker in markers"
        :key="marker.key"
        type="button"
        class="diagram-marker"
        :class="{ active: activeMarkerKey === marker.key }"
        :style="{
          left: marker.anchor[0] + '%',
          top: marker.anchor[1] + '%',
          background: colorFor(marker.tone),
        }"
        :aria-label="`${marker.label}：${marker.badgeLabel}`"
        @click="handleMarkerClick(marker)"
      />

      <div
        v-if="activeMarker"
        class="diagram-tooltip"
        :style="{ left: activeMarker.anchor[0] + '%', top: activeMarker.anchor[1] + '%' }"
      >
        {{ activeMarker.label }}
      </div>
    </div>

    <div class="diagram-stats">
      <div v-for="group in statCounts" :key="group.key" class="diagram-stat">
        <span class="diagram-stat-count">{{ group.count }}</span>
        <span class="diagram-stat-label">{{ group.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diagram-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.diagram-stage {
  position: relative;
  width: 100%;
  padding-top: 57%;
  background: linear-gradient(180deg, #f4f6fa, #e8ecf3);
  border-radius: var(--radius-md);
}

.bike-illustration {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.diagram-marker {
  position: absolute;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(20, 24, 31, 0.22);
  transform: translate(-50%, -50%);
}

.diagram-marker.active {
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.9),
    0 2px 6px rgba(20, 24, 31, 0.3);
}

.diagram-tooltip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  background: #fff;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(20, 24, 31, 0.25);
  white-space: nowrap;
  pointer-events: none;
}

.diagram-tooltip::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #fff;
}

.diagram-stats {
  display: flex;
  gap: var(--space-sm);
}

.diagram-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) 4px;
}

.diagram-stat-count {
  font-size: 18px;
  font-weight: 900;
  color: var(--color-text-primary);
}

.diagram-stat-label {
  font-size: 10.5px;
  color: var(--color-text-secondary);
  font-weight: 700;
}
</style>
