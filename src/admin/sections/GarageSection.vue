<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  listAllVehicles,
  listAllVerifications,
  listUserProfiles,
  type AdminUserProfile,
} from '../services/admin-data.service'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'

const router = useRouter()

const loading = ref(true)
const vehicles = ref<Vehicle[]>([])
const users = ref<AdminUserProfile[]>([])
const verifications = ref<Verification[]>([])
const filter = ref<'all' | 'flagged'>('all')

function ownerName(ownerId?: string): string {
  if (!ownerId) return '—'
  return users.value.find((u) => u.uid === ownerId)?.displayName || ownerId.slice(0, 8)
}

/** A vehicle's own verification history recording a lower mileage than an
 * earlier one — real, computed from actual verification records. */
function hasOdoAnomaly(vehicleId: string): boolean {
  const history = verifications.value
    .filter((v) => v.vehicleId === vehicleId && typeof v.mileage === 'number')
    .sort((a, b) => a.createdAt - b.createdAt)
  for (let i = 1; i < history.length; i += 1) {
    if ((history[i].mileage as number) < (history[i - 1].mileage as number)) return true
  }
  return false
}

function isFlagged(v: Vehicle): boolean {
  return hasOdoAnomaly(v.id) || !v.engineNumber || !v.chassisNumber
}

const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  passed: '已通過',
  failed: '未通過',
}

function registrationStatusLabel(v: Vehicle): string {
  const status = v.registrationVerification?.status
  return status ? (REGISTRATION_STATUS_LABEL[status] ?? status) : '尚未驗證'
}

const withLicenseCount = computed(() => vehicles.value.filter((v) => v.licensePlate).length)
const odoAnomalyCount = computed(() => vehicles.value.filter((v) => hasOdoAnomaly(v.id)).length)
const flaggedCount = computed(() => vehicles.value.filter(isFlagged).length)

const filteredVehicles = computed(() => {
  const sorted = [...vehicles.value].sort((a, b) => b.createdAt - a.createdAt)
  return filter.value === 'flagged' ? sorted.filter(isFlagged) : sorted
})

function openVehicle(id: string): void {
  router.push(`/admin/vehicles/${id}`)
}

onMounted(async () => {
  const [allVehicles, allUsers, allVerifications] = await Promise.all([
    listAllVehicles(),
    listUserProfiles(),
    listAllVerifications(),
  ])
  vehicles.value = allVehicles
  users.value = allUsers
  verifications.value = allVerifications
  loading.value = false
})
</script>

<template>
  <div>
    <p class="admin-page-intro">
      對應 app 首頁「我的車輛」與車輛詳情頁。點一列可以看該車輛的完整履歷——識別資料、行照照片／OCR
      結果、檢驗紀錄都在同一頁。
    </p>

    <dl class="admin-strip">
      <div>
        <dt>登記車輛</dt>
        <dd>{{ loading ? '—' : vehicles.length }}</dd>
        <div class="note">本月新增未追蹤</div>
      </div>
      <div>
        <dt>已上載牌照</dt>
        <dd>{{ loading ? '—' : withLicenseCount }}</dd>
        <div class="note">有值即算</div>
      </div>
      <div>
        <dt>里程異常</dt>
        <dd>{{ loading ? '—' : odoAnomalyCount }}</dd>
        <div class="note">同車輛回填數字小於前次</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>車輛列表</h2>
        <div class="spacer"></div>
        <div class="admin-filters">
          <button class="admin-chip" :class="{ active: filter === 'all' }" @click="filter = 'all'">
            全部
          </button>
          <button
            class="admin-chip"
            :class="{ active: filter === 'flagged' }"
            @click="filter = 'flagged'"
          >
            需要關注（{{ flaggedCount }}）
          </button>
        </div>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>車輛</th>
              <th>車主</th>
              <th>牌照</th>
              <th>行照驗證</th>
              <th>問題</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredVehicles.length === 0">
              <td class="admin-empty-cell" colspan="5">目前沒有符合條件的車輛</td>
            </tr>
            <tr
              v-for="v in filteredVehicles"
              :key="v.id"
              class="clickable"
              @click="openVehicle(v.id)"
            >
              <td class="strong">{{ v.brand }} {{ v.model }}</td>
              <td class="dim">{{ ownerName(v.currentOwnerId) }}</td>
              <td class="dim">{{ v.licensePlate || '—' }}</td>
              <td>
                <span
                  class="admin-pill"
                  :class="{
                    ok: v.registrationVerification?.status === 'passed',
                    risk: v.registrationVerification?.status === 'failed',
                    mute: !v.registrationVerification,
                  }"
                >
                  {{ registrationStatusLabel(v) }}
                </span>
                <span
                  v-if="v.registrationVerification?.method === 'local'"
                  class="admin-pill attn"
                >
                  本機備援（Gemini 失敗）
                </span>
              </td>
              <td>
                <span v-if="hasOdoAnomaly(v.id)" class="admin-pill risk">里程異常</span>
                <span v-if="!v.engineNumber" class="admin-pill attn">缺引擎號碼</span>
                <span v-if="!v.chassisNumber" class="admin-pill attn">缺車身號碼</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-note">
      里程數字用於驗證<b>車輛存在性</b>，不用於估算車況——中古車在轉手或儀表板維修時本來就可能歸零重計，
      異常仍歸為車主自報，設計上未強制攔截或篡改判定車輛資格。
      異常影響的是後續分析與稽核的樣本篩選，要看真實交易請看稽核與授權管理。
    </div>
  </div>
</template>
