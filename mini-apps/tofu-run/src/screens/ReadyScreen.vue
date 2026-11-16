<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { startGps, stopGps } from '@tofu/services/gps'

defineEmits<{ go: []; cancel: [] }>()

const accuracy = ref<number | null>(null)
const gpsError = ref('')

onMounted(async () => {
  try {
    await startGps(
      (fix) => {
        accuracy.value = Math.round(fix.accuracy)
        gpsError.value = ''
      },
      (message) => (gpsError.value = message),
    )
  } catch (error) {
    gpsError.value = error instanceof Error ? error.message : String(error)
  }
})
onBeforeUnmount(() => void stopGps())
</script>

<template>
  <div class="screen">
    <h1>出發前確認</h1>
    <div class="card">
      <p>✅ 手機放在<b>跟校正時同一個位置</b>，並且固定好</p>
      <p>✅ 引擎已發動、戴好安全帽</p>
      <p>✅ 音量調大，騎乘中會用語音提醒豆腐狀況</p>
    </div>
    <div class="card">
      <div class="stat">
        <span>GPS</span>
        <b :class="accuracy !== null && accuracy <= 30 ? 'ok' : 'wait'">
          {{ accuracy === null ? '定位中…' : `精度 ±${accuracy} m` }}
        </b>
      </div>
      <p v-if="gpsError" class="error">{{ gpsError }}</p>
      <p class="muted">定位精度在 30 公尺內才會累計距離。</p>
    </div>
    <div class="spacer" />
    <button class="btn" :disabled="accuracy === null" @click="$emit('go')">出發（之後請不要碰手機）</button>
    <button class="btn ghost" @click="$emit('cancel')">返回</button>
  </div>
</template>

<style scoped>
.ok { color: var(--good); }
.wait { color: var(--warn); }
</style>
