<script setup lang="ts">
/**
 * One-time full-screen walkthrough shown before a user's very first
 * verification (see VerificationStepsView.vue's showTour/isFreshVerification
 * gating — never shown when resuming an in-progress verification). Purely
 * instructional: explains the Hub, required-item marking, the 基本12項健檢
 * tap/long-press gesture, and the submit gate. "略過導覽" and finishing the
 * last slide both mark the tour seen (see tour.service.ts) — either way it
 * never shows again on this device.
 */
import { Compass, Hand, ListChecks, CircleCheck, Check, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import PrimaryButton from '@/components/common/PrimaryButton.vue'

const emit = defineEmits<{ done: [] }>()

interface Slide {
  icon: typeof Compass
  title: string
  desc: string
}

const SLIDES: Slide[] = [
  {
    icon: Compass,
    title: '歡迎使用驗車流程',
    desc: '「驗車進度」會列出所有檢查分類，可依任何順序完成，中途也能隨時離開，下次會從原本的地方繼續。',
  },
  {
    icon: ListChecks,
    title: '必填項目有 ＊ 記號',
    desc: '標示「＊」的項目為必填，其餘為選填。完成度會即時顯示在每個分類卡片與頂部進度條上。',
  },
  {
    icon: Hand,
    title: '點擊打勾，長按可選打叉',
    desc: '在「基本12項健檢」中，點擊照片上的項目標籤會快速標示正常；長按則會彈出選單，可選擇打勾（正常）或打叉（異常）。',
  },
  {
    icon: CircleCheck,
    title: '完成所有必填後即可送出',
    desc: '不需要照順序把每一頁填完才能翻頁——只要在送出前，所有必填項目都已完成，就能按下「完成驗證」。',
  },
]

const step = ref(0)
const isLast = computed(() => step.value === SLIDES.length - 1)
const current = computed(() => SLIDES[step.value])

function next(): void {
  if (isLast.value) {
    emit('done')
    return
  }
  step.value += 1
}

function skip(): void {
  emit('done')
}
</script>

<template>
  <div class="tour-overlay">
    <button class="skip-btn" @click="skip">略過導覽</button>

    <div class="tour-body">
      <div class="icon-wrap">
        <component :is="current.icon" :size="40" />
        <template v-if="step === 2">
          <span class="mini-badge pass"><Check :size="12" /></span>
          <span class="mini-badge fail"><X :size="12" /></span>
        </template>
      </div>
      <h2>{{ current.title }}</h2>
      <p>{{ current.desc }}</p>
    </div>

    <div class="tour-footer">
      <div class="dots">
        <span
          v-for="(slide, i) in SLIDES"
          :key="slide.title"
          class="dot"
          :class="{ active: i === step }"
        />
      </div>
      <PrimaryButton block @click="next">{{ isLast ? '開始使用' : '下一步' }}</PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  padding: var(--space-lg);
  padding-top: calc(var(--space-lg) + env(safe-area-inset-top));
  padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom));
}

/* Deliberately loud (filled pill, primary color, top-right) rather than a
   quiet text link — user explicitly asked for "顯著的" (prominent) skip. */
.skip-btn {
  align-self: flex-end;
  border: 1.5px solid var(--color-primary);
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
  padding: 7px 16px;
  border-radius: 999px;
  flex-shrink: 0;
}

.tour-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-md);
  padding: 0 var(--space-md);
}

.icon-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-sm);
}

.mini-badge {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 6px rgba(20, 24, 31, 0.3);
}

.mini-badge.pass {
  top: -2px;
  right: -2px;
  background: var(--color-success);
}

.mini-badge.fail {
  bottom: -2px;
  right: -2px;
  background: var(--color-danger);
}

.tour-body h2 {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.tour-body p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  max-width: 320px;
}

.tour-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  flex-shrink: 0;
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 0.2s ease;
}

.dot.active {
  width: 20px;
  border-radius: 999px;
  background: var(--color-primary);
}
</style>
