<script setup lang="ts">
import { computed } from 'vue'

import DeliveryScene from '@tofu/components/DeliveryScene.vue'
import type { LocalCalibration } from '@tofu/services/data'

const props = defineProps<{ calibration: LocalCalibration | null; error: string }>()
defineEmits<{ calibrate: []; play: []; history: [] }>()

const calibratedOn = computed(() =>
  props.calibration ? new Date(props.calibration.createdAt).toLocaleString('zh-TW') : '',
)
</script>

<template>
  <div class="screen">
    <DeliveryScene class="hero" />
    <div class="title">
      <h1>送豆腐</h1>
      <p class="muted">平穩騎完一趟，把豆腐完整送到。</p>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="card">
      <h2>基準值</h2>
      <template v-if="calibration">
        <p class="muted">
          {{ calibration.vehicleType === 'scooter' ? '速可達' : '檔車' }}・校正於 {{ calibratedOn }}
        </p>
        <div class="stat"><span>怠速震動</span><b>{{ calibration.baseline.idleVibration.toFixed(2) }} m/s²</b></div>
        <div class="stat"><span>催油門震動</span><b>{{ calibration.baseline.revVibration.toFixed(2) }} m/s²</b></div>
        <div v-if="calibration.baseline.audio.idleDb !== null" class="stat">
          <span>怠速音量</span><b>{{ calibration.baseline.audio.idleDb }} dBFS</b>
        </div>
      </template>
      <p v-else class="muted">
        第一次遊玩前，要先用引擎檢測做基準值校正：手機固定在車上、引擎發動，錄 18 秒的聲音與震動。
      </p>
    </div>

    <div class="spacer" />
    <button class="btn" :disabled="!calibration" @click="$emit('play')">開始送豆腐</button>
    <button class="btn secondary" @click="$emit('calibrate')">
      {{ calibration ? '重新校正基準值' : '開始基準值校正' }}
    </button>
    <button class="btn ghost" @click="$emit('history')">送貨紀錄</button>
  </div>
</template>

<style scoped>
.hero { margin: 0 -4px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45); animation: rise 0.6s ease-out both; }
.title { text-align: center; animation: rise 0.6s ease-out 0.1s both; }
.title h1 { font-size: 34px; letter-spacing: 0.12em; }
.card { animation: rise 0.6s ease-out 0.2s both; }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
</style>
