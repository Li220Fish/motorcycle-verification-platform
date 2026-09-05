<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { listAllVoltageSessions } from '../services/admin-data.service'
import type { VoltageSession } from '@/types/voltage-session'

const loading = ref(true)
const sessions = ref<VoltageSession[]>([])

const distinctProbes = computed(
  () => new Set(sessions.value.map((s) => s.probeId).filter(Boolean)).size,
)

onMounted(async () => {
  sessions.value = await listAllVoltageSessions()
  loading.value = false
})
</script>

<template>
  <div>
    <div class="admin-guard amber">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 8v5M12 16.5v.01"></path>
      </svg>
      <div>
        <h4>目前沒有任何 Probe 資料會寫入這裡</h4>
        <p>
          app 端的 <code>voltageSessionService.start()/finish()</code> 已經寫好，但實際的 Probe
          量測流程（<code>probe.store.ts</code> / 藍牙連線）目前沒有呼叫它——量測結果只留在畫面上，
          從未寫進 Firestore 的 <code>voltageSessions</code> 集合。這裡看到的表格永遠是空的， 直到
          app 端接上這段儲存邏輯為止；也完全沒有「裝置序號」「配對成功率」這類欄位，
          因為根本沒有裝置配對紀錄的集合。詳見後台彙報。
        </p>
      </div>
    </div>

    <dl class="admin-strip">
      <div>
        <dt>量測紀錄</dt>
        <dd>{{ loading ? '—' : sessions.length }}</dd>
        <div class="note">voltageSessions 筆數</div>
      </div>
      <div>
        <dt>出現過的 Probe</dt>
        <dd>{{ loading ? '—' : distinctProbes }}</dd>
        <div class="note">依 probeId 去重</div>
      </div>
      <div>
        <dt>配對成功率</dt>
        <dd>—</dd>
        <div class="note">無配對嘗試紀錄，無法計算</div>
      </div>
      <div>
        <dt>Mock 模式佔比</dt>
        <dd>—</dd>
        <div class="note">量測結果未記錄使用模式</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head"><h2>量測紀錄</h2></div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Probe</th>
              <th>車輛</th>
              <th>開始</th>
              <th>結束</th>
              <th>平均電壓</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && sessions.length === 0">
              <td class="admin-empty-cell" colspan="5">尚無資料</td>
            </tr>
            <tr v-for="s in sessions" :key="s.id">
              <td class="mono">{{ s.probeId ?? '—' }}</td>
              <td class="dim mono">{{ s.vehicleId.slice(0, 10) }}…</td>
              <td class="dim">{{ new Date(s.startedAt).toLocaleString('zh-TW') }}</td>
              <td class="dim">
                {{ s.endedAt ? new Date(s.endedAt).toLocaleString('zh-TW') : '—' }}
              </td>
              <td class="num">{{ s.result?.averageVoltage?.toFixed(2) ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
