<script setup lang="ts">
import { BatteryFull } from 'lucide-vue-next'

defineProps<{
  connected: boolean
  deviceName: string
}>()
</script>

<template>
  <div class="status-card">
    <div class="status-left">
      <span class="dot" :class="{ connected }" />
      <span class="status-text">{{ connected ? '已連線' : '未連線' }}</span>
      <span v-if="connected" class="device-name">{{ deviceName }}</span>
    </div>
    <div v-if="connected" class="battery">
      <BatteryFull :size="18" />
      <span>100%</span>
    </div>
  </div>
</template>

<style scoped>
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  color: #fff;
}

.status-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-text-disabled);
}

.dot.connected {
  background: var(--color-probe-voltage);
}

.status-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.device-name {
  font-size: 14px;
  font-weight: 700;
}

.battery {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
