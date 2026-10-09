<script setup lang="ts">
/**
 * Shoot first, classify later: starting a bike takes one tap. The vehicle
 * model (車款) is assigned afterwards on the computer, in /admin → 訓練資料集
 * → 審核標注 → 車款分類. Only 速克達/檔車 is picked on the phone (inside the
 * camera), and only because it changes the guide frames' shape.
 */
import { ref } from 'vue'

import { VEHICLE_TYPE_LABEL, type TrainingSession } from '@/data/training/training-dataset.types'
import { createSession, isDataCollector, listMySessions } from '@capture/services/capture.service'
import { lastVehicleType } from '@capture/services/vehicle-type-pref'

const props = defineProps<{ uid: string; email: string }>()
const emit = defineEmits<{ openSession: [id: string, fresh: boolean]; signOut: [] }>()

const loading = ref(true)
const allowed = ref(false)
const sessions = ref<TrainingSession[]>([])
const creating = ref(false)
const error = ref('')
const loadError = ref('')

async function start(): Promise<void> {
  creating.value = true
  error.value = ''
  try {
    const id = await createSession({
      collectorUid: props.uid,
      vehicleModelId: null,
      vehicleModelLabel: '',
      vehicleType: lastVehicleType(),
      // Unknown until classified — the chain shot is offered (optional).
      hasChain: true,
      notes: '',
    })
    emit('openSession', id, true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '建立失敗'
  } finally {
    creating.value = false
  }
}

function formatDate(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Sessions are newest-first; number them oldest = 1 for a stable label. */
function sessionTitle(s: TrainingSession, index: number): string {
  return s.vehicleModelLabel || `第 ${sessions.value.length - index} 台（未分類）`
}

function loadErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code
  if (code === 'permission-denied') return '沒有讀取權限（伺服器存取規則可能尚未更新）。'
  if (code === 'unavailable') return '連不上伺服器，請確認網路。'
  return e instanceof Error ? e.message : '載入失敗'
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    allowed.value = await isDataCollector(props.uid)
    if (allowed.value) sessions.value = await listMySessions(props.uid)
  } catch (e) {
    loadError.value = loadErrorMessage(e)
  } finally {
    loading.value = false
  }
}

void load()
</script>

<template>
  <div class="page">
    <header class="page-head row">
      <div>
        <h1>訓練資料採集</h1>
        <p class="muted small">{{ email }}</p>
      </div>
      <button class="link" @click="emit('signOut')">登出</button>
    </header>

    <p v-if="loading" class="muted center">載入中…</p>

    <div v-else-if="loadError" class="card">
      <h2>載入失敗</h2>
      <p class="bad small">{{ loadError }}</p>
      <button class="btn primary" @click="load">重試</button>
    </div>

    <div v-else-if="!allowed" class="card">
      <h2>尚未開通採集權限</h2>
      <p class="muted">請管理員到後台「訓練資料集 › 採集人員」加入這個帳號後重新整理。</p>
      <p class="mono small">uid：{{ uid }}</p>
    </div>

    <template v-else>
      <button class="start" :disabled="creating" @click="start">
        <span class="start-icon" aria-hidden="true">＋</span>
        <span>
          <strong>{{ creating ? '準備中…' : '拍一台新車' }}</strong>
          <small>直接開始拍，車款回電腦再分類</small>
        </span>
      </button>
      <p v-if="error" class="bad small">{{ error }}</p>

      <section>
        <h2 class="section-title">我的採集紀錄</h2>
        <p v-if="!sessions.length" class="muted small">還沒有紀錄。</p>
        <button
          v-for="(s, i) in sessions"
          :key="s.id"
          class="session-row"
          @click="emit('openSession', s.id, false)"
        >
          <span class="session-text">
            <strong>{{ sessionTitle(s, i) }}</strong>
            <small class="muted"
              >{{ VEHICLE_TYPE_LABEL[s.vehicleType] }} · {{ formatDate(s.createdAt) }}</small
            >
          </span>
          <span class="pill" :class="s.status === 'completed' ? 'good' : 'open'">
            {{ s.status === 'completed' ? '已結束' : '進行中' }}
          </span>
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.start {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 22px 20px;
  border: 0;
  border-radius: 16px;
  background: var(--guide);
  color: #1e1400;
  font: inherit;
  text-align: left;
}

.start:disabled {
  opacity: 0.6;
}

.start-icon {
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}

.start strong {
  display: block;
  font-size: 20px;
}

.start small {
  font-size: 13px;
  opacity: 0.75;
}

.section-title {
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
  margin: 26px 0 8px;
}

.session-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;
  padding: 12px;
  margin-bottom: 6px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: inherit;
  font: inherit;
  text-align: left;
}

.session-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pill {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
}

.pill.open {
  background: var(--warn-soft);
  color: var(--warn);
}

.pill.good {
  background: var(--ok-soft);
  color: var(--ok);
}
</style>
