<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'lg'
  }>(),
  { size: 'sm' },
)
</script>

<template>
  <div class="logo" :class="size">
    <span class="logo-icon">
      <!-- Inlined (not an <img> to /favicon.svg) so its stroke/fill can
           follow the icon's own fixed brand colors reliably at any size,
           same reasoning lucide-vue-next icons were already inlined SVG
           components rather than files. Path data copied verbatim from the
           app icon source. -->
      <svg viewBox="0 0 618 618" class="logo-mark">
        <rect width="618" height="618" fill="#2C4BEA" />
        <g transform="translate(-28,-10)">
          <path
            d="M295.2,327.7 A70,70 0 1 0 308.6,430"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="50"
          />
          <path
            d="M155,158 H380 C437,158 482,200 482,252 C482,300 445,338 395,345 L520,472 L448,474 L265,380 L340,282 H378 C398,282 410,268 410,252 C410,236 398,220 378,220 H208 Z"
            fill="#FFFFFF"
            stroke="#2C4BEA"
            stroke-width="14"
            stroke-linejoin="miter"
            paint-order="stroke"
          />
        </g>
      </svg>
    </span>
    <span class="logo-text">RiDE</span>
  </div>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.logo.lg .logo-icon {
  width: 48px;
  height: 48px;
}

.logo-mark {
  width: 100%;
  height: 100%;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.logo.lg .logo-text {
  font-size: 26px;
}
</style>
