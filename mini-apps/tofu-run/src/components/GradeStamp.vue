<script setup lang="ts">
import { computed } from 'vue'

import type { Grade } from '@tofu/core/tofu-engine'

/** Result-screen stamp that slams onto the screen, with confetti for good grades. */
const props = defineProps<{ grade: Grade | null }>()

const tone = computed(() => {
  if (!props.grade) return 'none'
  if (props.grade === '失敗') return 'fail'
  if (props.grade === 'S' || props.grade === 'A') return 'great'
  return 'ok'
})
const CAPTIONS: Record<Grade, string> = { S: '完美送達', A: '漂亮', B: '還不錯', C: '有點晃', D: '勉強及格', 失敗: '豆腐碎了' }
const caption = computed(() => (props.grade ? CAPTIONS[props.grade] : '距離不足'))
const COLORS = ['#ff8a1f', '#ffc53d', '#3ddc84', '#7cc7ff', '#ff5d5d', '#fffdf6']
const confetti = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 13) % 20) / 20,
  duration: 1.8 + ((i * 7) % 10) / 10,
  color: COLORS[i % COLORS.length],
  rotate: (i * 47) % 360,
  wide: i % 3 === 0,
}))
</script>

<template>
  <div class="stamp-wrap" :class="tone">
    <div v-if="tone === 'great' || tone === 'ok'" class="confetti" aria-hidden="true">
      <i
        v-for="(piece, i) in confetti"
        :key="i"
        :class="{ wide: piece.wide }"
        :style="{
          left: `${piece.left}%`,
          background: piece.color,
          animationDelay: `${0.45 + piece.delay}s`,
          animationDuration: `${piece.duration}s`,
          '--r': `${piece.rotate}deg`,
        }"
      />
    </div>
    <div class="stamp">
      <span class="grade">{{ grade ?? '—' }}</span>
      <span class="caption">{{ caption }}</span>
    </div>
  </div>
</template>

<style scoped>
.stamp-wrap { position: relative; display: flex; justify-content: center; padding: 8px 0; }
.stamp {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 6px solid currentColor;
  outline: 2px solid currentColor;
  outline-offset: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  transform: rotate(-12deg);
  animation: slam 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) both 0.15s;
}
.great .stamp { color: #ffc53d; }
.fail .stamp, .none .stamp { color: var(--bad); }
.grade { font-size: 72px; font-weight: 900; line-height: 1; }
.fail .grade { font-size: 46px; }
.caption { font-size: 14px; font-weight: 800; letter-spacing: 0.1em; }

.confetti { position: absolute; inset: -40px 0 auto; height: 360px; pointer-events: none; overflow: hidden; }
.confetti i {
  position: absolute;
  top: -12px;
  width: 7px;
  height: 11px;
  border-radius: 2px;
  opacity: 0;
  animation-name: fall;
  animation-timing-function: ease-in;
  animation-iteration-count: 2;
  animation-fill-mode: both;
}
.confetti i.wide { width: 11px; height: 6px; }

@keyframes slam {
  0% { transform: scale(2.6) rotate(-30deg); opacity: 0; }
  60% { transform: scale(0.92) rotate(-10deg); opacity: 1; }
  100% { transform: scale(1) rotate(-12deg); opacity: 1; }
}
@keyframes fall {
  0% { transform: translateY(0) rotate(0); opacity: 1; }
  100% { transform: translateY(360px) rotate(var(--r)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .stamp { animation: none; }
  .confetti { display: none; }
}
</style>
