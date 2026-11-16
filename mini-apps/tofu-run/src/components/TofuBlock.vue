<script setup lang="ts">
import { computed } from 'vue'

import type { TofuMotion } from './tofu-motion'

/**
 * The tofu character. Its face, cracks and sweat follow `integrity`; pass a
 * new `motion` to play a one-shot jiggle (sway) or squash (bump).
 */
const props = withDefaults(
  defineProps<{
    integrity?: number
    motion?: TofuMotion | null
    idle?: boolean
    size?: number | string
  }>(),
  { integrity: 100, motion: null, idle: true, size: 200 },
)

type Mood = 'happy' | 'calm' | 'worried' | 'scared' | 'broken'

const mood = computed<Mood>(() => {
  const value = props.integrity
  if (value <= 0) return 'broken'
  if (value < 20) return 'scared'
  if (value < 50) return 'worried'
  if (value < 80) return 'calm'
  return 'happy'
})
const cracks = computed(() => (props.integrity <= 0 ? 4 : props.integrity < 20 ? 3 : props.integrity < 50 ? 2 : props.integrity < 80 ? 1 : 0))
// Re-keying the group restarts the one-shot CSS animation.
const motionKey = computed(() => props.motion?.n ?? 0)
const motionClass = computed(() => props.motion?.kind ?? '')
</script>

<template>
  <svg
    class="tofu"
    :class="[mood, { idle: idle && mood !== 'broken' }]"
    :style="{ width: typeof size === 'number' ? `${size}px` : size }"
    viewBox="0 0 200 200"
    role="img"
    :aria-label="`豆腐完整度 ${Math.round(integrity)}%`"
  >
    <ellipse class="shadow" cx="100" cy="176" rx="64" ry="11" />

    <g :key="motionKey" :class="['motion', motionClass]">
      <g class="body">
        <!-- intact block (split into halves when broken) -->
        <g class="half left-half">
          <polygon class="top" points="100,40 160,70 100,100 40,70" />
          <polygon class="left" points="40,70 100,100 100,160 40,130" />
        </g>
        <g class="half right-half">
          <polygon class="right" points="100,100 160,70 160,130 100,160" />
          <polygon class="top" points="100,40 160,70 100,100" />
        </g>
        <!-- soft highlight on the top face -->
        <ellipse class="shine" cx="88" cy="62" rx="20" ry="7" transform="rotate(-24 88 62)" />

        <!-- cracks -->
        <g class="cracks">
          <path v-if="cracks >= 1" d="M58 84 L66 96 L61 104 L70 116" />
          <path v-if="cracks >= 2" d="M148 82 L139 95 L146 104 L136 120" />
          <path v-if="cracks >= 2" d="M116 56 L106 64 L114 70" />
          <path v-if="cracks >= 3" d="M50 120 L62 126 L58 134" />
          <path v-if="cracks >= 3" d="M152 112 L142 118 L150 126 L140 140" />
        </g>

        <!-- face, straddling the front edge -->
        <g class="face">
          <template v-if="mood === 'happy'">
            <path class="eye-line" d="M74 114 Q81 106 88 114" />
            <path class="eye-line" d="M112 114 Q119 106 126 114" />
            <path class="mouth" d="M90 128 Q100 138 110 128" />
          </template>
          <template v-else-if="mood === 'calm'">
            <circle class="eye" cx="81" cy="113" r="4.5" />
            <circle class="eye" cx="119" cy="113" r="4.5" />
            <path class="mouth" d="M92 130 Q100 134 108 130" />
          </template>
          <template v-else-if="mood === 'worried'">
            <path class="brow" d="M73 104 L88 100" />
            <path class="brow" d="M127 104 L112 100" />
            <circle class="eye" cx="81" cy="114" r="4.5" />
            <circle class="eye" cx="119" cy="114" r="4.5" />
            <path class="mouth" d="M90 134 Q100 126 110 134" />
          </template>
          <template v-else-if="mood === 'scared'">
            <circle class="eye-white" cx="81" cy="113" r="8" />
            <circle class="eye-white" cx="119" cy="113" r="8" />
            <circle class="eye" cx="81" cy="114" r="3.5" />
            <circle class="eye" cx="119" cy="114" r="3.5" />
            <ellipse class="mouth-o" cx="100" cy="134" rx="6" ry="7" />
          </template>
          <template v-else>
            <path class="eye-line" d="M75 108 L87 120 M87 108 L75 120" />
            <path class="eye-line" d="M113 108 L125 120 M125 108 L113 120" />
            <path class="mouth" d="M88 136 L94 131 L100 136 L106 131 L112 136" />
          </template>
          <ellipse v-if="mood !== 'broken'" class="blush" cx="68" cy="126" rx="7" ry="4" />
          <ellipse v-if="mood !== 'broken'" class="blush" cx="132" cy="126" rx="7" ry="4" />
        </g>
      </g>

      <!-- sweat drops when things get rough -->
      <g v-if="mood === 'worried' || mood === 'scared'" class="sweat">
        <path class="drop d1" d="M166 52 Q172 62 166 66 Q160 62 166 52 Z" />
        <path v-if="mood === 'scared'" class="drop d2" d="M34 58 Q40 68 34 72 Q28 68 34 58 Z" />
      </g>
      <!-- crumbs when broken -->
      <g v-if="mood === 'broken'" class="crumbs">
        <rect x="58" y="164" width="9" height="8" rx="2" />
        <rect x="132" y="166" width="11" height="8" rx="2" />
        <rect x="96" y="170" width="7" height="6" rx="2" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.tofu { overflow: visible; display: block; height: auto; aspect-ratio: 1; }
.shadow { fill: rgba(0, 0, 0, 0.35); }
.top { fill: #fffdf6; stroke: #e2d6b4; stroke-width: 2; stroke-linejoin: round; }
.left { fill: #f3ead3; stroke: #e2d6b4; stroke-width: 2; stroke-linejoin: round; }
.right { fill: #e7dcbf; stroke: #e2d6b4; stroke-width: 2; stroke-linejoin: round; }
.shine { fill: #fff; opacity: 0.9; }
.cracks path { fill: none; stroke: #a8946a; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; animation: crack-in 0.35s ease-out; }
.eye, .eye-line, .brow, .mouth { stroke: #3b2f22; stroke-width: 4; stroke-linecap: round; fill: none; }
.eye { fill: #3b2f22; stroke: none; }
.eye-white { fill: #fff; stroke: #3b2f22; stroke-width: 2.5; }
.mouth-o { fill: #3b2f22; }
.blush { fill: #ff9f9f; opacity: 0.55; }
.drop { fill: #7cc7ff; }
.crumbs rect { fill: #f3ead3; stroke: #e2d6b4; stroke-width: 1.5; }

.body, .motion { transform-box: view-box; transform-origin: 100px 160px; }
.idle .body { animation: wobble 2.6s ease-in-out infinite; }
.motion.sway { animation: jiggle 0.7s ease-out; }
.motion.bump { animation: squash 0.55s ease-out; }
.sweat .d1 { animation: drip 1.1s ease-in infinite; }
.sweat .d2 { animation: drip 1.1s ease-in 0.5s infinite; }

.broken .half { transform-box: view-box; transform-origin: 100px 160px; transition: transform 0.6s cubic-bezier(0.3, 1.6, 0.5, 1); }
.broken .left-half { transform: translate(-14px, 6px) rotate(-9deg); }
.broken .right-half { transform: translate(14px, 6px) rotate(9deg); }
.broken .shine { opacity: 0; }
.broken .face { transform: translateY(4px); }

@keyframes wobble {
  0%, 100% { transform: skewX(0deg) scale(1, 1); }
  25% { transform: skewX(1.5deg) scale(1.01, 0.99); }
  75% { transform: skewX(-1.5deg) scale(0.99, 1.01); }
}
@keyframes jiggle {
  0% { transform: skewX(0); }
  15% { transform: skewX(-12deg); }
  35% { transform: skewX(9deg); }
  55% { transform: skewX(-5deg); }
  75% { transform: skewX(2deg); }
  100% { transform: skewX(0); }
}
@keyframes squash {
  0% { transform: scale(1, 1); }
  20% { transform: scale(1.18, 0.78); }
  45% { transform: scale(0.92, 1.1) translateY(-10px); }
  70% { transform: scale(1.05, 0.95); }
  100% { transform: scale(1, 1); }
}
@keyframes drip {
  0% { transform: translateY(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(26px); opacity: 0; }
}
@keyframes crack-in {
  from { stroke-dasharray: 60; stroke-dashoffset: 60; }
  to { stroke-dasharray: 60; stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .idle .body, .motion.sway, .motion.bump, .sweat .drop { animation: none; }
}
</style>
