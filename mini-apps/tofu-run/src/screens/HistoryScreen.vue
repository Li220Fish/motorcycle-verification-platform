<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { listRuns, type RunRecord } from '@tofu/services/data'

const props = defineProps<{ uid: string | null }>()
defineEmits<{ back: [] }>()

const runs = ref<RunRecord[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')

onMounted(async () => {
  if (!props.uid) {
    state.value = 'error'
    return
  }
  try {
    runs.value = await listRuns(props.uid)
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
})
</script>

<template>
  <div class="screen">
    <h1>送貨紀錄</h1>
    <p v-if="state === 'loading'" class="muted">載入中…</p>
    <p v-else-if="state === 'error'" class="error">無法讀取紀錄，請確認網路連線。</p>
    <p v-else-if="runs.length === 0" class="muted">還沒有送過豆腐。</p>
    <div v-for="run in runs" :key="run.id" class="card">
      <div class="stat">
        <span>{{ new Date(run.startedAt).toLocaleString('zh-TW') }}</span>
        <b class="grade">{{ run.grade ?? '—' }}</b>
      </div>
      <p class="muted">
        {{ (run.distanceMeters / 1000).toFixed(2) }} km ・ 完整度 {{ Math.round(run.integrity) }}% ・
        晃動 {{ run.eventCounts.sway }}／顛簸 {{ run.eventCounts.bump }}
      </p>
    </div>
    <div class="spacer" />
    <button class="btn secondary" @click="$emit('back')">返回</button>
  </div>
</template>

<style scoped>
.grade { color: var(--accent); font-size: 20px; }
</style>
