<script setup lang="ts">
import { Check } from 'lucide-vue-next'

import type { UserUsageRole } from '@/types/user-preference'

const props = defineProps<{ currentRole: UserUsageRole; open: boolean }>()
const emit = defineEmits<{ select: [UserUsageRole]; close: [] }>()

const ROLE_META: Record<UserUsageRole, { label: string; desc: string }> = {
  buyer: { label: '買家', desc: '找車、查詢與比較' },
  seller: { label: '賣家', desc: '車況驗證與交易' },
  professional_seller: { label: '專業賣家', desc: '批量管理車輛' },
}

function handleSelect(role: UserUsageRole): void {
  emit('select', role)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="props.open" class="sheet-backdrop" @click="emit('close')" />
    </Transition>
    <Transition name="sheet-slide">
      <div v-if="props.open" class="sheet">
        <p class="sheet-title">使用模式</p>
        <button
          v-for="role in ['buyer', 'seller', 'professional_seller'] as UserUsageRole[]"
          :key="role"
          class="sheet-option"
          :class="{ active: role === props.currentRole }"
          @click="handleSelect(role)"
        >
          <span class="mark"><Check v-if="role === props.currentRole" :size="16" /></span>
          <span class="option-info">
            <span class="option-title">{{ ROLE_META[role].label }}</span>
            <span class="option-desc">{{ ROLE_META[role].desc }}</span>
          </span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 40;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 41;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: var(--space-lg) var(--space-md) calc(var(--space-lg) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.15);
}

.sheet-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.sheet-option {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  text-align: left;
}

.sheet-option.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.sheet-option .mark {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.sheet-option.active .mark {
  border-color: var(--color-primary);
}

.option-info {
  display: flex;
  flex-direction: column;
}

.option-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.option-desc {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.22s ease;
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
