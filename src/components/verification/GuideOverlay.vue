<script setup lang="ts">
/**
 * Guide frames over a 3:4 viewfinder — ported directly from
 * projectTest/ride/capture-app/src/components/GuideOverlay.vue (the 採集
 * App's training-photo camera, already proven on real devices). The SVG's
 * viewBox (300×400, from training-shots.ts's GUIDE_VIEW_W/H) is also 3:4 and
 * the container is exactly 3:4, so guide geometry maps 1:1 onto the screen.
 *
 * Reused here (not just in capture-app) because training-shots.ts's guide
 * geometry is keyed by the SAME 基本12項健檢 part keys
 * (basic-health-check-items.ts) — see HealthCheckIssuePhotoCapture.vue,
 * which shows this when a collector/verifier marks one of those 12 items
 * 異常 and needs a focused evidence photo of that exact part.
 */
import { computed } from 'vue'

import { GUIDE_VIEW_H as VH, GUIDE_VIEW_W as VW, partLabel, type GuideShape } from '@/data/training/training-shots'

const props = defineProps<{ guides: GuideShape[]; tone: 'ok' | 'warn' }>()

/** First labelled, non-hint shape is the shot's subject. */
const primaryIndex = computed(() =>
  props.guides.findIndex((g) => g.kind !== 'dot' && !g.hint && g.label),
)

const shapes = computed(() =>
  props.guides.map((g, i) => {
    const primary = i === primaryIndex.value
    const label = g.kind === 'dot' ? g.text : g.label ? partLabel(g.label) : ''
    if (g.kind === 'rect') {
      return {
        key: i,
        kind: g.kind,
        primary,
        hint: !!g.hint,
        transform: `rotate(${g.a} ${g.cx} ${g.cy})`,
        x: g.cx - g.w / 2,
        y: g.cy - g.h / 2,
        w: g.w,
        h: g.h,
        labelX: g.cx,
        labelY: g.cy - g.h / 2 - 8,
        label,
      }
    }
    if (g.kind === 'circle') {
      return {
        key: i,
        kind: g.kind,
        primary,
        hint: !!g.hint,
        cx: g.cx,
        cy: g.cy,
        r: g.r,
        labelX: g.cx,
        labelY: g.cy - g.r - 8,
        label,
      }
    }
    return {
      key: i,
      kind: g.kind,
      primary: false,
      hint: false,
      cx: g.cx,
      cy: g.cy,
      labelX: g.cx + 9,
      labelY: g.cy + 4,
      label,
    }
  }),
)

const primary = computed(() => shapes.value[primaryIndex.value])
</script>

<template>
  <svg class="guide" :viewBox="`0 0 ${VW} ${VH}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <mask id="guide-hole">
        <rect x="0" y="0" :width="VW" :height="VH" fill="white" />
        <rect
          v-if="primary?.kind === 'rect'"
          :x="primary.x"
          :y="primary.y"
          :width="primary.w"
          :height="primary.h"
          :transform="primary.transform"
          rx="5"
          fill="black"
        />
        <circle
          v-else-if="primary?.kind === 'circle'"
          :cx="primary.cx"
          :cy="primary.cy"
          :r="primary.r"
          fill="black"
        />
      </mask>
    </defs>
    <rect x="0" y="0" :width="VW" :height="VH" fill="rgba(0,0,0,0.38)" mask="url(#guide-hole)" />

    <!-- rule-of-thirds hairlines -->
    <g class="thirds">
      <line :x1="VW / 3" y1="0" :x2="VW / 3" :y2="VH" />
      <line :x1="(VW * 2) / 3" y1="0" :x2="(VW * 2) / 3" :y2="VH" />
      <line x1="0" :y1="VH / 3" :x2="VW" :y2="VH / 3" />
      <line x1="0" :y1="(VH * 2) / 3" :x2="VW" :y2="(VH * 2) / 3" />
    </g>

    <g
      v-for="s in shapes"
      :key="s.key"
      :class="['shape', s.kind, s.primary ? `primary ${tone}` : s.hint ? 'hint' : 'secondary']"
    >
      <rect
        v-if="s.kind === 'rect'"
        :x="s.x"
        :y="s.y"
        :width="s.w"
        :height="s.h"
        :transform="s.transform"
        rx="5"
      />
      <circle v-else-if="s.kind === 'circle'" :cx="s.cx" :cy="s.cy" :r="s.r" />
      <circle v-else :cx="s.cx" :cy="s.cy" r="5" />
      <text
        v-if="s.label"
        :x="s.labelX"
        :y="s.labelY"
        :text-anchor="s.kind === 'dot' ? 'start' : 'middle'"
      >
        {{ s.label }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.guide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.shape rect,
.shape circle {
  fill: none;
  vector-effect: non-scaling-stroke;
}

.shape.primary rect,
.shape.primary circle {
  stroke-width: 3;
}

.shape.primary.ok rect,
.shape.primary.ok circle {
  stroke: var(--color-success, #22c55e);
}

.shape.primary.warn rect,
.shape.primary.warn circle {
  stroke: #ffd04a;
}

.shape.secondary rect,
.shape.secondary circle,
.shape.hint rect,
.shape.hint circle {
  stroke: #ffd04a;
  stroke-opacity: 0.75;
  stroke-width: 1.5;
  stroke-dasharray: 6 5;
}

.shape.dot circle {
  fill: rgba(255, 208, 74, 0.3);
  stroke: #ffd04a;
  stroke-width: 2;
}

.shape text {
  font-size: 11px;
  font-weight: 700;
  fill: #ffd04a;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.65);
  stroke-width: 3px;
}

.thirds line {
  stroke: rgba(255, 255, 255, 0.14);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
</style>
