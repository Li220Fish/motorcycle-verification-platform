<script setup lang="ts">
/**
 * One shared schematic motorcycle side-view outline, reused by both the
 * Appearance Capture Map (all groups shown as tappable hotspots) and
 * PhotoGuide (single active region highlighted during capture) — see
 * appearance-groups.ts. Satisfies the UX report's "可以共用一張機車輪廓，
 * 但要對應 Highlight 不同部位" requirement: one silhouette, per-part highlight.
 */
export interface DiagramHighlight {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

withDefaults(
  defineProps<{
    highlights: DiagramHighlight[]
    interactive?: boolean
  }>(),
  { interactive: false },
)

defineEmits<{ select: [string] }>()
</script>

<template>
  <div class="diagram">
    <svg viewBox="0 0 300 150" class="diagram-svg" role="img" aria-label="機車部位示意圖">
      <!-- shared outline -->
      <g class="outline">
        <circle cx="55" cy="112" r="30" />
        <circle cx="245" cy="112" r="30" />
        <circle cx="55" cy="112" r="10" />
        <circle cx="245" cy="112" r="10" />
        <path d="M55,90 C70,55 110,45 150,45 C185,45 205,50 222,68" />
        <rect x="130" y="52" width="65" height="14" rx="6" />
        <path d="M222,68 L255,45 L268,60" />
        <circle cx="268" cy="63" r="7" />
        <path d="M85,95 L215,95" stroke-dasharray="4 4" />
        <rect x="12" y="96" width="16" height="12" rx="2" />
        <path d="M40,102 L20,90" />
      </g>
    </svg>

    <button
      v-for="highlight in highlights"
      :key="highlight.id"
      class="hotspot"
      :class="{ interactive }"
      :style="{
        left: `${(highlight.x / 300) * 100}%`,
        top: `${(highlight.y / 150) * 100}%`,
        width: `${(highlight.w / 300) * 100}%`,
        height: `${(highlight.h / 150) * 100}%`,
      }"
      :aria-label="highlight.label"
      :tabindex="interactive ? 0 : -1"
      @click="interactive && $emit('select', highlight.id)"
    />
  </div>
</template>

<style scoped>
.diagram {
  position: relative;
  width: 100%;
  aspect-ratio: 300 / 150;
}

.diagram-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.outline {
  fill: none;
  stroke: var(--color-text-disabled);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.outline rect {
  fill: var(--color-background);
}

.hotspot {
  position: absolute;
  border: none;
  padding: 0;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-primary) 22%, transparent);
  border: 1.5px solid var(--color-primary);
  pointer-events: none;
}

.hotspot.interactive {
  pointer-events: auto;
}
</style>
