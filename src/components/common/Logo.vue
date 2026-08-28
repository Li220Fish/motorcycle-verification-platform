<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'

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
      <ShieldCheck :size="size === 'lg' ? 28 : 20" color="#ffffff" />
    </span>
    <span class="logo-text"><span class="moto">Moto</span><span class="verify">Verify</span></span>
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
  background: var(--color-primary-dark);
  flex-shrink: 0;
}

.logo.lg .logo-icon {
  width: 48px;
  height: 48px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.logo.lg .logo-text {
  font-size: 26px;
}

.moto {
  color: var(--color-text-primary);
}

.verify {
  color: var(--color-primary);
}
</style>
