<script setup lang="ts">
import { Building2, ShieldCheck, UserRound } from 'lucide-vue-next'

import type { UserUsageRole } from '@/types/user-preference'

defineEmits<{ select: [UserUsageRole] }>()
</script>

<template>
  <div class="role-selection">
    <div class="intro">
      <p class="eyebrow">MotoVerify</p>
      <h1>選擇您的使用方式</h1>
      <p class="sub">我們會依照您的需求，顯示最適合的功能。</p>
    </div>

    <div class="primary-cards">
      <button class="role-card" @click="$emit('select', 'buyer')">
        <span class="icon buyer"><UserRound :size="26" color="#fff" /></span>
        <span class="title">我是買家</span>
        <span class="desc">找車、查車況、比較車輛</span>
        <span class="cta">開始找車 →</span>
      </button>

      <button class="role-card" @click="$emit('select', 'seller')">
        <span class="icon seller"><ShieldCheck :size="26" color="#fff" /></span>
        <span class="title">我是賣家</span>
        <span class="desc">驗證車況、建立可信報告</span>
        <span class="cta">開始驗車 →</span>
      </button>
    </div>

    <button class="professional-row" @click="$emit('select', 'professional_seller')">
      <span class="icon pro"><Building2 :size="20" color="var(--color-primary)" /></span>
      <span class="pro-info">
        <span class="pro-title">專業賣家 / 車商</span>
        <span class="pro-desc">批量管理車輛與驗證紀錄</span>
      </span>
      <span class="pro-arrow">→</span>
    </button>
  </div>
</template>

<style scoped>
.role-selection {
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--space-xl) var(--space-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-xl);
  background: var(--color-background);
}

.intro {
  text-align: center;
}

.eyebrow {
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  text-transform: uppercase;
  margin: 0 0 8px;
}

.intro h1 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 8px;
  color: var(--color-text-primary);
}

.intro .sub {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.primary-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.role-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.role-card:active {
  transform: scale(0.99);
}

.role-card .icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.role-card .icon.buyer {
  background: var(--color-primary);
}

.role-card .icon.seller {
  background: var(--color-primary-dark);
}

.role-card .title {
  font-size: 19px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.role-card .desc {
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.role-card .cta {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
}

.professional-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.professional-row .icon.pro {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--color-primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pro-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
}

.pro-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.pro-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.pro-arrow {
  flex-shrink: 0;
  color: var(--color-text-disabled);
  font-weight: 700;
}
</style>
