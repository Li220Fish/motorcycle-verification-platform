<script setup lang="ts">
import { computed } from 'vue'

/** Calibration visual: a tachometer plus sound-wave bars. Idle = needle
 *  ticking low, rev = needle sweeping up and the bars swelling. */
const props = defineProps<{ phase: 'idle' | 'rev' | 'off' }>()

const BAR_COUNT = 21
const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
  // Taller in the middle, pseudo-random rhythm per bar.
  base: 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / BAR_COUNT),
  delay: ((i * 7) % 11) * 0.06,
}))
const ticks = Array.from({ length: 11 }, (_, i) => {
  const angle = (-120 + i * 24) * (Math.PI / 180)
  return {
    x1: 100 + Math.sin(angle) * 50,
    y1: 100 - Math.cos(angle) * 50,
    x2: 100 + Math.sin(angle) * (i % 2 ? 55 : 59),
    y2: 100 - Math.cos(angle) * (i % 2 ? 55 : 59),
    red: i >= 9,
  }
})
const label = computed(() => (props.phase === 'rev' ? '催油門' : props.phase === 'idle' ? '怠速' : ''))
</script>

<template>
  <div class="engine" :class="phase">
    <svg class="gauge" viewBox="0 0 200 145" role="img" :aria-label="`引擎 ${label}`">
      <path d="M39.4 135 A70 70 0 1 1 160.6 135" fill="none" stroke="#2c313c" stroke-width="10" stroke-linecap="round" />
      <path class="redline" d="M169.6 107.3 A70 70 0 0 1 160.6 135" fill="none" stroke="#ff5d5d" stroke-width="10" stroke-linecap="round" />
      <line
        v-for="(tick, i) in ticks"
        :key="i"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        :stroke="tick.red ? '#ff5d5d' : '#9aa3b2'"
        stroke-width="3"
        stroke-linecap="round"
      />
      <g class="needle">
        <line x1="100" y1="100" x2="100" y2="44" stroke="#ff8a1f" stroke-width="5" stroke-linecap="round" />
      </g>
      <circle cx="100" cy="100" r="9" fill="#ff8a1f" />
      <text x="100" y="132" text-anchor="middle" class="rpm">x1000 rpm</text>
    </svg>
    <div class="bars" aria-hidden="true">
      <span
        v-for="(bar, i) in bars"
        :key="i"
        :style="{ '--base': bar.base, animationDelay: `${bar.delay}s` }"
      />
    </div>
  </div>
</template>

<style scoped>
.engine { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
.gauge { width: min(260px, 70vw); height: auto; overflow: visible; }
.rpm { fill: #9aa3b2; font-size: 11px; }
.needle { transform-origin: 100px 100px; transform: rotate(-120deg); transition: transform 0.4s; }
.idle .needle { animation: idle-needle 0.18s ease-in-out infinite alternate; }
.rev .needle { animation: rev-needle 1.6s ease-in-out infinite; }
.redline { opacity: 0.35; }
.rev .redline { animation: flash 1.6s ease-in-out infinite; }

.bars { display: flex; align-items: center; justify-content: center; gap: 4px; height: 70px; width: 100%; }
.bars span {
  width: 6px;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(#ffc53d, #ff8a1f);
  transform: scaleY(0.06);
  transition: transform 0.3s;
}
.idle .bars span { animation: idle-bar 0.32s ease-in-out infinite alternate; }
.rev .bars span { animation: rev-bar 0.22s ease-in-out infinite alternate; }

@keyframes idle-needle { from { transform: rotate(-98deg); } to { transform: rotate(-92deg); } }
@keyframes rev-needle {
  0% { transform: rotate(-96deg); }
  45% { transform: rotate(40deg); }
  60% { transform: rotate(32deg); }
  100% { transform: rotate(-96deg); }
}
@keyframes flash { 0%, 100% { opacity: 0.35; } 45% { opacity: 1; } }
@keyframes idle-bar {
  from { transform: scaleY(calc(var(--base) * 0.12)); }
  to { transform: scaleY(calc(var(--base) * 0.32)); }
}
@keyframes rev-bar {
  from { transform: scaleY(calc(var(--base) * 0.35)); }
  to { transform: scaleY(var(--base)); }
}
@media (prefers-reduced-motion: reduce) {
  .needle, .bars span, .redline { animation: none !important; }
}
</style>
