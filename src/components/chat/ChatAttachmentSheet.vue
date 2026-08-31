<script setup lang="ts">
import { Bike, Camera, ShieldCheck, X } from 'lucide-vue-next'

defineEmits<{ close: []; pickImage: []; shareVehicle: []; shareReport: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="sheet">
        <div class="handle" />
        <div class="sheet-head">
          <h3>分享內容</h3>
          <button class="close-btn" aria-label="關閉" @click="$emit('close')">
            <X :size="16" />
          </button>
        </div>
        <button class="option" @click="$emit('pickImage')">
          <span class="icon"><Camera :size="18" /></span>照片
        </button>
        <button class="option" @click="$emit('shareVehicle')">
          <span class="icon"><Bike :size="18" /></span>車輛
        </button>
        <button class="option" @click="$emit('shareReport')">
          <span class="icon"><ShieldCheck :size="18" /></span>驗證報告
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}

.sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.handle {
  width: 36px;
  height: 4px;
  border-radius: 99px;
  background: var(--color-border);
  margin: 0 auto 4px;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-head h3 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  background: var(--color-background);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 4px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: left;
}

.icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
