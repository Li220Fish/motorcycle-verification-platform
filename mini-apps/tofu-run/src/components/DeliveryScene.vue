<script setup lang="ts">
/** Home-screen hero: a scooter carrying a tofu box through the night city. */
withDefaults(defineProps<{ moving?: boolean }>(), { moving: true })

const stars = [
  [24, 22], [70, 40], [118, 16], [168, 34], [214, 14], [262, 44], [300, 20], [336, 38], [48, 64], [190, 60],
]
// Two identical 360-wide skyline strips side by side, scrolled as one.
const far = [
  [0, 70, 34], [38, 52, 28], [70, 84, 40], [114, 60, 26], [144, 92, 34], [182, 66, 30], [216, 78, 44], [264, 56, 26], [294, 88, 36], [334, 62, 26],
]
const near = [
  [6, 46, 40, true], [52, 64, 30, false], [88, 40, 52, true], [146, 58, 34, false], [186, 44, 46, true], [238, 70, 32, false], [276, 50, 48, true], [330, 38, 30, false],
] as const
</script>

<template>
  <svg class="scene" :class="{ moving }" viewBox="0 0 360 220" role="img" aria-label="騎著機車送豆腐">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#14182a" />
        <stop offset="1" stop-color="#2a1d2e" />
      </linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffe9a8" stop-opacity="0.7" />
        <stop offset="1" stop-color="#ffe9a8" stop-opacity="0" />
      </linearGradient>
    </defs>

    <rect width="360" height="220" fill="url(#sky)" />
    <circle cx="300" cy="42" r="16" fill="#fff4d6" />
    <circle cx="306" cy="37" r="14" fill="#1a1d2e" opacity="0.9" />
    <circle v-for="([x, y], i) in stars" :key="i" class="star" :style="{ animationDelay: `${i * 0.37}s` }" :cx="x" :cy="y" r="1.4" />

    <g class="far">
      <g v-for="copy in [0, 360]" :key="copy" :transform="`translate(${copy} 0)`">
        <rect v-for="([x, h, w], i) in far" :key="i" :x="x" :y="192 - h" :width="w" :height="h" fill="#232843" />
      </g>
    </g>
    <g class="near">
      <g v-for="copy in [0, 360]" :key="copy" :transform="`translate(${copy} 0)`">
        <g v-for="([x, h, w, lit], i) in near" :key="i">
          <rect :x="x" :y="192 - h" :width="w" :height="h" fill="#2f3553" />
          <template v-if="lit">
            <rect :x="x + 6" :y="192 - h + 8" width="6" height="6" fill="#ffcf6b" opacity="0.85" />
            <rect :x="x + w - 12" :y="192 - h + 22" width="6" height="6" fill="#ffcf6b" opacity="0.6" />
          </template>
        </g>
      </g>
    </g>

    <!-- road -->
    <rect y="190" width="360" height="30" fill="#1b1e26" />
    <line class="lane" x1="0" y1="206" x2="360" y2="206" />

    <!-- speed lines -->
    <g class="speed">
      <line x1="20" y1="132" x2="58" y2="132" />
      <line x1="34" y1="150" x2="64" y2="150" />
      <line x1="12" y1="168" x2="44" y2="168" />
    </g>

    <g class="scooter">
      <!-- headlight beam -->
      <polygon points="262,104 360,84 360,140" fill="url(#beam)" />

      <!-- tofu cargo on the rear rack -->
      <g class="cargo">
        <path d="M76 98 L102 110 L128 98 L128 104 L102 116 L76 104 Z" fill="#5a6070" />
        <line x1="102" y1="116" x2="112" y2="124" stroke="#5a6070" stroke-width="4" stroke-linecap="round" />
        <polygon points="102,72 124,82 102,92 80,82" fill="#fffdf6" stroke="#e2d6b4" stroke-width="1.5" />
        <polygon points="80,82 102,92 102,110 80,100" fill="#f3ead3" stroke="#e2d6b4" stroke-width="1.5" />
        <polygon points="102,92 124,82 124,100 102,110" fill="#e7dcbf" stroke="#e2d6b4" stroke-width="1.5" />
        <path d="M89 98 Q92 95 95 98 M108 98 Q111 95 114 98" stroke="#3b2f22" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M98 103 Q101.5 106 105 103" stroke="#3b2f22" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>

      <!-- body -->
      <path d="M86 156 Q82 120 126 118 L170 118 Q180 122 174 146 L132 152 Z" fill="#ff8a1f" />
      <path d="M116 114 Q142 104 172 112 L170 120 L118 120 Z" fill="#2b2f3a" />
      <rect x="128" y="142" width="84" height="12" rx="5" fill="#d96f10" />
      <path d="M204 154 L218 98 Q224 86 236 92 L242 100 L228 156 Z" fill="#ff8a1f" />
      <line x1="232" y1="98" x2="254" y2="170" stroke="#8a90a0" stroke-width="5" stroke-linecap="round" />
      <path d="M232 166 Q254 140 276 166" fill="none" stroke="#d96f10" stroke-width="6" stroke-linecap="round" />
      <line x1="222" y1="86" x2="242" y2="80" stroke="#2b2f3a" stroke-width="5" stroke-linecap="round" />
      <circle cx="248" cy="102" r="6" fill="#ffe9a8" />

      <!-- rider -->
      <path d="M140 116 L176 120 L190 144" fill="none" stroke="#3b4a7a" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M146 114 L160 76" fill="none" stroke="#4a5c96" stroke-width="16" stroke-linecap="round" />
      <path d="M160 82 L196 92 L226 86" fill="none" stroke="#4a5c96" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="166" cy="60" r="15" fill="#ff8a1f" />
      <path d="M170 54 Q184 54 181 66 L170 66 Z" fill="#2b2f3a" />

      <!-- wheels -->
      <g v-for="cx in [108, 254]" :key="cx">
        <circle :cx="cx" cy="170" r="21" fill="#15171c" />
        <circle :cx="cx" cy="170" r="11" fill="#5a6070" />
        <g class="spokes" :style="{ transformOrigin: `${cx}px 170px` }">
          <line :x1="cx - 10" y1="170" :x2="cx + 10" y2="170" stroke="#c9ced8" stroke-width="2.5" />
          <line :x1="cx" y1="160" :x2="cx" y2="180" stroke="#c9ced8" stroke-width="2.5" />
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.scene { display: block; width: 100%; height: auto; border-radius: 20px; }
.star { fill: #fff; animation: twinkle 2.4s ease-in-out infinite; }
.lane { stroke: #f2c14e; stroke-width: 3; stroke-dasharray: 22 18; }
.speed line { stroke: #9aa3b2; stroke-width: 2.5; stroke-linecap: round; opacity: 0; }
.spokes { transform-box: view-box; }
.cargo, .scooter { transform-box: view-box; }
.cargo { transform-origin: 102px 112px; }

.moving .far { animation: scroll 26s linear infinite; }
.moving .near { animation: scroll 12s linear infinite; }
.moving .lane { animation: lane 0.5s linear infinite; }
.moving .spokes { animation: spin 0.35s linear infinite; }
.moving .scooter { animation: bob 0.9s ease-in-out infinite; }
.moving .cargo { animation: cargo 0.9s ease-in-out infinite; }
.moving .speed line { animation: whoosh 0.8s linear infinite; }
.moving .speed line:nth-child(2) { animation-delay: 0.27s; }
.moving .speed line:nth-child(3) { animation-delay: 0.53s; }

@keyframes scroll { to { transform: translateX(-360px); } }
@keyframes lane { to { stroke-dashoffset: 40; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes cargo {
  0%, 100% { transform: translateY(0) rotate(0); }
  30% { transform: translateY(-4px) rotate(-3deg); }
  60% { transform: translateY(0) rotate(2deg); }
}
@keyframes whoosh {
  0% { transform: translateX(30px); opacity: 0; }
  30% { opacity: 0.8; }
  100% { transform: translateX(-30px); opacity: 0; }
}
@keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .scene * { animation: none !important; }
}
</style>
