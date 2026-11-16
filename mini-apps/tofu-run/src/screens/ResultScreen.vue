<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import RouteSketch from '@tofu/components/RouteSketch.vue'
import { MIN_DELIVERY_METERS } from '@tofu/core/tofu-engine'
import { saveRun, type RunRecord } from '@tofu/services/data'

const props = defineProps<{ run: RunRecord }>()
defineEmits<{ home: []; again: [] }>()

const saveState = ref<'saving' | 'saved' | 'failed' | 'offline'>('saving')

const verdict = computed(() => {
  if (!props.run.grade) return `距離不到 ${MIN_DELIVERY_METERS} 公尺，這趟不列入成績`
  if (props.run.grade === '失敗') return '豆腐碎了…下次騎穩一點'
  return '送達！'
})

onMounted(async () => {
  if (!props.run.uid) {
    saveState.value = 'offline'
    return
  }
  try {
    await saveRun(props.run)
    saveState.value = 'saved'
  } catch {
    saveState.value = 'failed'
  }
})
</script>

<template>
  <div class="screen">
    <h1>{{ verdict }}</h1>
    <div class="grade-card card">
      <p class="grade">{{ run.grade ?? '—' }}</p>
      <p class="muted">豆腐完整度 {{ Math.round(run.integrity) }}%</p>
    </div>
    <div class="card">
      <div class="stat"><span>距離</span><b>{{ (run.distanceMeters / 1000).toFixed(2) }} km</b></div>
      <div class="stat"><span>時間</span><b>{{ Math.floor(run.durationSeconds / 60) }} 分 {{ run.durationSeconds % 60 }} 秒</b></div>
      <div class="stat"><span>劇烈晃動（急煞／急加速／急轉）</span><b>{{ run.eventCounts.sway }} 次</b></div>
      <div class="stat"><span>顛簸</span><b>{{ run.eventCounts.bump }} 次</b></div>
    </div>
    <RouteSketch :path="run.path" />
    <p class="muted">
      {{
        saveState === 'saving' ? '上傳成績中…'
        : saveState === 'saved' ? '成績已上傳'
        : saveState === 'offline' ? '未連上伺服器，成績沒有上傳'
        : '成績上傳失敗'
      }}
    </p>
    <div class="spacer" />
    <button class="btn" @click="$emit('again')">再送一趟</button>
    <button class="btn secondary" @click="$emit('home')">回首頁</button>
  </div>
</template>

<style scoped>
.grade-card { align-items: center; }
.grade { font-size: 88px; font-weight: 900; line-height: 1; color: var(--accent); }
</style>
