<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  listAllVehicles,
  listAllVerifications,
  listUserProfiles,
  type AdminUserProfile,
} from '../services/admin-data.service'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'

const loading = ref(true)
const vehicles = ref<Vehicle[]>([])
const users = ref<AdminUserProfile[]>([])
const verifications = ref<Verification[]>([])

/** Brand names typically electric — no real fuel-type field exists on
 * Vehicle, so this is a name-matching heuristic, not authoritative data. */
const EV_BRANDS = ['GOGORO', 'ESUN', 'PGO E', 'AI-1']

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

function isLikelyEv(brand: string): boolean {
  return EV_BRANDS.some((b) => brand.toUpperCase().includes(b))
}

const withLicenseCount = computed(() => vehicles.value.filter((v) => v.licensePlate).length)
const odoAnomalyCount = computed(() => vehicles.value.filter((v) => hasOdoAnomaly(v.id)).length)
const evCount = computed(() => vehicles.value.filter((v) => isLikelyEv(v.brand)).length)

const flaggedVehicles = computed(() =>
  vehicles.value.filter((v) => hasOdoAnomaly(v.id) || !v.engineNumber || !v.chassisNumber),
)

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
      對應 app 首頁「我的車輛」與車輛詳情頁。這裡管理的是車輛本身的識別資料（引擎號碼、車身號碼）與
      里程異常，車況本身的判斷交給檢驗流程。
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
      <div>
        <dt>疑似電動車</dt>
        <dd>{{ loading ? '—' : evCount }}</dd>
        <div class="note">依品牌名稱推測，非真實欄位</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>需要關注的車輛</h2>
        <span class="sub">里程異常或身分資料不完整</span>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>車輛</th>
              <th>車主</th>
              <th>問題</th>
              <th>細節</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && flaggedVehicles.length === 0">
              <td class="admin-empty-cell" colspan="4">目前沒有需要關注的車輛</td>
            </tr>
            <tr v-for="v in flaggedVehicles" :key="v.id">
              <td class="strong">{{ v.brand }} {{ v.model }}</td>
              <td class="dim">{{ ownerName(v.currentOwnerId) }}</td>
              <td>
                <span v-if="hasOdoAnomaly(v.id)" class="admin-pill risk">里程異常</span>
                <span v-else class="admin-pill attn">身分資料不完整</span>
              </td>
              <td class="dim">
                {{ !v.engineNumber ? '缺引擎號碼 ' : '' }}{{ !v.chassisNumber ? '缺車身號碼' : '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-panel">
      <div class="admin-panel-head"><h2>里程異常處理原則</h2></div>
      <div class="admin-panel-body">
        <div class="admin-note">
          里程數字用於驗證<b>車輛存在性</b>，不用於估算車況——中古車在轉手或儀表板維修時本來就可能歸零重計，
          異常仍歸為車主自報，設計上未強制攔截或篡改判定車輛資格。
          異常影響的是後續分析與稽核的樣本篩選，要看真實交易請看稽核與授權管理。
        </div>
      </div>
    </div>
  </div>
</template>
