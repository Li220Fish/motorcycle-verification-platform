<script setup lang="ts">
/**
 * 上路 (RIDE-01) — shown once RideSafetyGate's safety checklist is confirmed.
 * Not a real inspection item (no photo/audio/motion evidence, no normal/
 * attention judgement to make) — purely a "go ride it, then come back"
 * transition screen, so it never falls through to VerificationItem.vue's
 * generic result-selector UI the way every other item type would.
 * Confirming here just marks RIDE-01 done (`normal` — there's nothing to
 * grade) and advances straight into 熱車檢查 (buyer-hot-check).
 */
import { ref } from 'vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useVerificationStore } from '@/stores/verification.store'

defineProps<{ verificationId: string }>()
const emit = defineEmits<{ advance: [] }>()

const verificationStore = useVerificationStore()

// A literal `src="/media/riding.gif"` in the template would make Vue's
// compiler treat it as a static asset import to resolve at BUILD time (this
// exact mistake broke `npm run build` outright — "Could not resolve
// '/media/riding.gif'" — since no such file exists yet). Binding it as a
// plain runtime string instead makes it a normal browser image request:
// harmlessly 404s today, and starts working the moment a real
// public/media/riding.gif is added, with no code change needed either way.
const gifSrc = '/media/riding.gif'
const gifFailed = ref(false)

async function handleDone(): Promise<void> {
  await verificationStore.saveAnswer('RIDE-01', 'normal')
  emit('advance')
}
</script>

<template>
  <div class="ride-transition">
    <div class="gif-frame">
      <!-- Placeholder — swap in a real riding GIF at public/media/riding.gif
           when one is available; until then this 404s and the CSS-animated
           fallback below shows instead. -->
      <img
        v-if="!gifFailed"
        :src="gifSrc"
        alt="騎車示意動畫"
        class="ride-gif"
        @error="gifFailed = true"
      />
      <div v-else class="gif-fallback">🏍️</div>
    </div>
    <h2>請開始上路測試</h2>
    <p class="main-copy">
      請依平常騎乘方式上路一小段路程，讓引擎進入熱車狀態。完成後回到此畫面，點擊下方按鈕繼續熱車檢查。
    </p>
    <PrimaryButton block @click="handleDone">已完成上路，開始熱車檢查</PrimaryButton>
  </div>
</template>

<style scoped>
.ride-transition {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-md);
  text-align: center;
}

.gif-frame {
  position: relative;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ride-gif {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Shown once the <img> fires @error (see gifFailed above) — purely a
   placeholder animation, not meant to ship as the final asset. */
.gif-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  animation: ride-bounce 1.2s ease-in-out infinite;
}

@keyframes ride-bounce {
  0%,
  100% {
    transform: translateX(-12px);
  }
  50% {
    transform: translateX(12px);
  }
}

h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.main-copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}
</style>
