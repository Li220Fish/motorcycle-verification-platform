<script setup lang="ts">
import { computed } from 'vue'

import buyerHero from '@/assets/home/buyer-hero.svg'
import professionalHero from '@/assets/home/professional-hero.svg'
import sellerHero from '@/assets/home/seller-hero.svg'
import type { UserUsageRole } from '@/types/user-preference'

const props = defineProps<{
  role: UserUsageRole
  brand: string
  title: string[]
  description: string
  primaryLabel: string
  secondaryLabel: string
}>()

const emit = defineEmits<{ primary: []; secondary: [] }>()

const heroImage = computed(
  () =>
    ({ buyer: buyerHero, seller: sellerHero, professional_seller: professionalHero })[props.role],
)
</script>

<template>
  <section class="hero">
    <div class="hero-art" :style="{ backgroundImage: `url(&quot;${heroImage}&quot;)` }" />
    <div class="overlay">
      <p class="brand">{{ brand }}</p>
      <h1 class="headline">
        <span v-for="(line, i) in title" :key="i">{{ line }}</span>
      </h1>
      <p class="description">{{ description }}</p>
      <div class="cta-row">
        <button class="primary-cta" @click="emit('primary')">{{ primaryLabel }}</button>
        <button class="secondary-cta" @click="emit('secondary')">{{ secondaryLabel }} →</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 300px;
  padding: var(--space-lg) var(--space-md) var(--space-xl);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: linear-gradient(165deg, var(--color-hero-from) 0%, var(--color-hero-to) 100%);
}

.hero-art {
  position: absolute;
  inset: 0;
  background-size: 440px auto;
  background-repeat: no-repeat;
  background-position: right -50px bottom -30px;
  opacity: 0.85;
  -webkit-mask-image: linear-gradient(100deg, transparent 0%, transparent 20%, #000 55%);
  mask-image: linear-gradient(100deg, transparent 0%, transparent 20%, #000 55%);
}

.overlay {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 320px;
}

.brand {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #9db8f0;
  margin: 0;
}

.headline {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.25;
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

.description {
  margin: 4px 0 6px;
  font-size: 14px;
  line-height: 1.6;
  color: #dbe4f7;
}

.cta-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-top: 6px;
}

.primary-cta {
  height: 48px;
  padding: 0 24px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.primary-cta:active {
  transform: scale(0.98);
}

.secondary-cta {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  padding: 4px 0;
}
</style>
