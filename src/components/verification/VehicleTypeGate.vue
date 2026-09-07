<script setup lang="ts">
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import type { EngineTransmissionType } from '@/data/verification/engine-session'

defineEmits<{ pick: [EngineTransmissionType] }>()
</script>

<template>
  <div class="vehicle-type-gate">
    <h2>請選擇車輛類型</h2>
    <p class="hint">
      這台車是「速可達」還是「檔車」？這會決定鏈條／齒盤等相關項目是否需要檢查，選擇後會記錄在這台車的資料上。
    </p>
    <div class="type-pick">
      <PrimaryButton variant="secondary" block @click="$emit('pick', 'scooter')">
        速可達
      </PrimaryButton>
      <PrimaryButton block @click="$emit('pick', 'manual')">檔車</PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.vehicle-type-gate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin: var(--space-md);
}

.vehicle-type-gate h2 {
  font-size: 18px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.type-pick {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
