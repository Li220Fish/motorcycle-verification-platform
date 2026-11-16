<script setup lang="ts">
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'

import { RESEARCH_LABELS, RESULT_ICON, RESULT_LABEL } from '@el/core/session'
import { db, storage } from '@el/services/firebase'
import { formatTime, STAFF_KEY } from './staff'

const props = defineProps<{ focusId: string | null }>()
const staff = inject(STAFF_KEY)!

interface Check extends DocumentData {
  id: string
}

const checks = ref<Check[]>([])
const selectedId = ref<string | null>(props.focusId)
const audioUrl = ref('')
const note = ref('')
const error = ref('')
const filter = ref<'all' | 'attention' | 'unreviewed'>('all')

const off = onSnapshot(
  query(collection(db, 'engineLineChecks'), orderBy('createdAt', 'desc'), limit(300)),
  (snapshot) => (checks.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
  (err) => (error.value = err.message),
)
onBeforeUnmount(off)

const visible = computed(() =>
  checks.value.filter((c) =>
    filter.value === 'attention'
      ? c.result?.overall === 'attention'
      : filter.value === 'unreviewed'
        ? !c.reviewedAt
        : true,
  ),
)
const selected = computed(() => checks.value.find((c) => c.id === selectedId.value) ?? null)

let loadedFor: string | null = null

async function loadSelected(): Promise<void> {
  const check = selected.value
  if (!check || loadedFor === check.id) return
  loadedFor = check.id
  audioUrl.value = ''
  note.value = (check.staffNote as string) ?? ''
  if (!check.audioPath) return
  try {
    audioUrl.value = await getDownloadURL(storageRef(storage, check.audioPath))
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

// Also re-runs when the list arrives after a focus id from the tickets tab.
watch([selectedId, checks], () => void loadSelected(), { immediate: true })

async function review(fields: Record<string, unknown>): Promise<void> {
  if (!selectedId.value) return
  try {
    await updateDoc(doc(db, 'engineLineChecks', selectedId.value), {
      ...fields,
      reviewedBy: staff.value?.name ?? null,
      reviewedAt: serverTimestamp(),
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function toggleLabel(label: string): void {
  const labels = new Set<string>((selected.value?.researchLabels as string[]) ?? [])
  if (labels.has(label)) labels.delete(label)
  else labels.add(label)
  void review({ researchLabels: [...labels] })
}

const VEHICLE_TYPE: Record<string, string> = { scooter: '速可達', manual: '檔車' }
</script>

<template>
  <div class="layout">
    <aside class="list" :class="{ hidden: selectedId }">
      <div class="filters">
        <button :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button :class="{ on: filter === 'attention' }" @click="filter = 'attention'">需注意</button>
        <button :class="{ on: filter === 'unreviewed' }" @click="filter = 'unreviewed'">未標註</button>
      </div>
      <p v-if="error" class="error pad">{{ error }}</p>
      <p v-if="!visible.length" class="muted pad">還沒有檢測紀錄。</p>
      <button v-for="c in visible" :key="c.id" class="row" :class="{ on: c.id === selectedId }" @click="selectedId = c.id">
        <div class="row-between">
          <b>{{ c.userName || (c.source === 'web' ? '網頁測試' : c.lineUserId?.slice(0, 10)) }}</b>
          <span class="muted small">{{ formatTime(c.createdAt) }}</span>
        </div>
        <div class="row-between">
          <span class="small">{{ [c.vehicle?.brand, c.vehicle?.model].filter(Boolean).join(' ') || VEHICLE_TYPE[c.vehicle?.type] || '' }}</span>
          <span class="small">
            {{ c.status === 'done' ? `${RESULT_ICON[c.result?.overall] ?? ''} ${RESULT_LABEL[c.result?.overall] ?? ''}` : c.status === 'failed' ? '❌ 失敗' : '⏳ 分析中' }}
          </span>
        </div>
        <span v-if="(c.researchLabels ?? []).length" class="muted small">🏷️ {{ c.researchLabels.join('、') }}</span>
      </button>
    </aside>

    <section v-if="selected" class="detail">
      <button class="link mobile-only" @click="selectedId = null">← 返回</button>
      <div class="card">
        <div class="row-between">
          <h3>{{ RESULT_ICON[selected.result?.overall] ?? '' }} {{ RESULT_LABEL[selected.result?.overall] ?? selected.status }}</h3>
          <span class="muted small">{{ formatTime(selected.createdAt) }}・{{ selected.source === 'liff' ? 'LINE' : '網頁' }}</span>
        </div>
        <audio v-if="audioUrl" :src="audioUrl" controls class="audio" />
        <p class="small muted">
          {{ VEHICLE_TYPE[selected.vehicle?.type] ?? '' }} {{ selected.vehicle?.brand }} {{ selected.vehicle?.model }}
          {{ selected.vehicle?.year }} {{ selected.vehicle?.mileageKm ? `${selected.vehicle.mileageKm} km` : '' }}
          ・震動樣本 {{ selected.imuSampleCount ?? 0 }}
        </p>
        <p v-if="selected.symptom" class="symptom">「{{ selected.symptom }}」</p>
        <p v-if="selected.error" class="error">{{ selected.error }}</p>
      </div>

      <div v-if="selected.result" class="card">
        <div v-for="item in selected.result.items" :key="item.id" class="item">
          <div class="row-between">
            <span>{{ item.title }}</span>
            <b>{{ RESULT_ICON[item.result] }} {{ RESULT_LABEL[item.result] }}</b>
          </div>
          <p class="muted small">{{ item.note || item.label }}・來源 {{ item.source }}</p>
        </div>
        <p v-if="selected.result.engineTypeNote" class="small">AI 判斷引擎類型：{{ selected.result.engineTypeNote }}</p>
        <p v-if="!selected.result.aiAvailable" class="small warn">⚠️ 這筆 AI 分析失敗，只有規則判斷。</p>
      </div>

      <div class="card">
        <h3>研究標註</h3>
        <div class="chips">
          <button
            v-for="label in RESEARCH_LABELS"
            :key="label"
            class="chip toggle"
            :class="{ on: (selected.researchLabels ?? []).includes(label) }"
            @click="toggleLabel(label)"
          >
            {{ label }}
          </button>
        </div>
        <textarea v-model="note" rows="3" placeholder="聽完錄音的備註（例：2 秒處有明顯金屬敲擊聲）" />
        <div class="row-between">
          <span class="muted small">{{ selected.reviewedBy ? `上次標註：${selected.reviewedBy} ${formatTime(selected.reviewedAt)}` : '尚未標註' }}</span>
          <button class="btn small secondary" @click="review({ staffNote: note })">儲存備註</button>
        </div>
      </div>
      <details class="card">
        <summary>DSP 原始分析（研究用）</summary>
        <pre>{{ JSON.stringify(selected.research?.recordingAssessment ?? {}, null, 2) }}</pre>
        <pre>{{ JSON.stringify(selected.research?.phaseAssessment ?? {}, null, 2) }}</pre>
      </details>
    </section>
    <section v-else class="detail empty muted">選擇一筆檢測</section>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 340px 1fr; height: calc(100vh - 54px); }
.list { border-right: 1px solid var(--line); overflow-y: auto; }
.filters { display: flex; gap: 4px; padding: 10px; position: sticky; top: 0; background: var(--bg); }
.filters button { flex: 1; border: 1px solid var(--line); background: var(--surface); padding: 6px; border-radius: 8px; font: inherit; font-size: 13px; color: var(--ink); cursor: pointer; }
.filters button.on { background: var(--accent); color: #fff; border-color: var(--accent); }
.row { display: flex; flex-direction: column; gap: 4px; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: none; padding: 10px 12px; font: inherit; color: var(--ink); cursor: pointer; }
.row.on { background: var(--accent-soft); }
.detail { overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.detail.empty { align-items: center; justify-content: center; }
h3 { margin: 0; font-size: 16px; }
.audio { width: 100%; margin: 10px 0 4px; }
.symptom { background: var(--bg); padding: 8px 10px; border-radius: 8px; margin: 6px 0 0; }
.item { padding: 6px 0; border-bottom: 1px solid var(--line); }
.item:last-of-type { border-bottom: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.chip { font: inherit; font-size: 13px; padding: 4px 10px; border-radius: 999px; background: var(--bg); border: 1px solid var(--line); color: var(--ink); cursor: pointer; }
.chip.on { background: var(--accent); color: #fff; border-color: var(--accent); }
textarea { width: 100%; box-sizing: border-box; font: inherit; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); margin-bottom: 8px; }
pre { font-size: 11px; overflow-x: auto; background: var(--bg); padding: 8px; border-radius: 8px; }
.warn { color: var(--warn); }
.pad { padding: 12px; }
.mobile-only { display: none; }
@media (max-width: 760px) {
  .layout { grid-template-columns: 1fr; }
  .list.hidden, .detail.empty { display: none; }
  .mobile-only { display: inline; align-self: flex-start; }
}
</style>
