<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  listAllListings,
  listAllReports,
  listAllVehicles,
  listAllVerifications,
  listAllVoltageSessions,
  listUserProfiles,
  type AdminReport,
} from '../services/admin-data.service'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'

const router = useRouter()
const loading = ref(true)

const userCount = ref(0)
const mauCount = ref(0)
const vehicleCount = ref(0)
const listingCount = ref(0)
const monthVerificationCount = ref(0)

const sellerCount = ref(0)
const buyerCount = ref(0)
const withVehicleCount = ref(0)
const withListingCount = ref(0)
const withProbeCount = ref(0)
const dormant7dCount = ref(0)

const pendingReports = ref<AdminReport[]>([])
const pendingVerifications = ref<Verification[]>([])

const DAY_MS = 24 * 60 * 60 * 1000

const tasks = computed(() => {
  const rows: { label: string; count: number; risk: 'attn' | 'risk'; page: string }[] = []
  if (pendingVerifications.value.length > 0) {
    rows.push({
      label: '待複核的檢驗',
      count: pendingVerifications.value.length,
      risk: 'attn',
      page: 'verify',
    })
  }
  if (pendingReports.value.length > 0) {
    rows.push({
      label: '待處理的檢舉',
      count: pendingReports.value.length,
      risk: 'risk',
      page: 'messages',
    })
  }
  return rows
})

function ratioWidth(part: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.min(100, Math.round((part / total) * 100))}%`
}

onMounted(async () => {
  const [users, vehicles, verifications, listings, reports, voltageSessions] = await Promise.all([
    listUserProfiles(),
    listAllVehicles(),
    listAllVerifications(),
    listAllListings(),
    listAllReports(),
    listAllVoltageSessions(),
  ])

  const now = Date.now()
  userCount.value = users.length
  mauCount.value = users.filter((u) => u.lastSeenAt > now - 30 * DAY_MS).length
  vehicleCount.value = vehicles.length
  listingCount.value = listings.length
  monthVerificationCount.value = verifications.filter((v) => {
    const d = new Date(v.createdAt)
    const n = new Date()
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
  }).length

  const sellers = new Set(
    verifications
      .filter((v) => v.type === 'seller' || v.type === 'professional')
      .map((v) => v.userId),
  )
  const buyers = new Set(verifications.filter((v) => v.type === 'buyer').map((v) => v.userId))
  sellerCount.value = sellers.size
  buyerCount.value = buyers.size
  withVehicleCount.value = new Set(
    vehicles.map((v: Vehicle) => v.currentOwnerId).filter((id): id is string => !!id),
  ).size
  withListingCount.value = new Set(
    listings
      .filter((l) => l.vehicleId)
      .map((l) => l.sellerId)
      .filter((id): id is string => !!id),
  ).size
  const verificationById = new Map(verifications.map((v) => [v.id, v]))
  withProbeCount.value = new Set(
    voltageSessions
      .map((s) => verificationById.get(s.verificationId)?.userId)
      .filter((id): id is string => !!id),
  ).size
  dormant7dCount.value = users.filter(
    (u) => u.lastSeenAt > 0 && u.lastSeenAt < now - 7 * DAY_MS,
  ).length

  pendingVerifications.value = verifications.filter(
    (v) => v.status === 'needs_review' || v.status === 'in_progress',
  )
  pendingReports.value = reports.filter((r) => r.status === 'pending')

  loading.value = false
})
</script>

<template>
  <div>
    <dl class="admin-strip">
      <div>
        <dt>註冊使用者</dt>
        <dd>{{ loading ? '—' : userCount }}</dd>
        <div class="note">users 集合筆數</div>
      </div>
      <div>
        <dt>月活躍使用者</dt>
        <dd>{{ loading ? '—' : mauCount }}</dd>
        <div class="note">近 30 天曾登入</div>
      </div>
      <div>
        <dt>登記車輛</dt>
        <dd>{{ loading ? '—' : vehicleCount }}</dd>
        <div class="note">vehicles 集合筆數</div>
      </div>
      <div>
        <dt>刊登數</dt>
        <dd>{{ loading ? '—' : listingCount }}</dd>
        <div class="note">尚無上下架狀態欄位，為全部筆數</div>
      </div>
      <div>
        <dt>本月檢驗</dt>
        <dd>{{ loading ? '—' : monthVerificationCount }}</dd>
        <div class="note">依建立日期計算</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>今天要處理的事</h2>
        <span class="sub">依風險排序</span>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>事項</th>
              <th class="num">數量</th>
              <th>風險</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && tasks.length === 0">
              <td class="admin-empty-cell" colspan="4">目前沒有待處理事項</td>
            </tr>
            <tr v-for="t in tasks" :key="t.label">
              <td class="strong">{{ t.label }}</td>
              <td class="num">{{ t.count }}</td>
              <td>
                <span class="admin-pill" :class="t.risk">{{
                  t.risk === 'risk' ? '高' : '中'
                }}</span>
              </td>
              <td>
                <button class="admin-btn sm" @click="router.push(`/admin/${t.page}`)">查看</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-split">
      <div class="admin-panel">
        <div class="admin-panel-head"><h2>使用者最常出現在哪個功能</h2></div>
        <div class="admin-panel-body">
          <div class="admin-note">
            此區塊在原設計中依頁面瀏覽事件計算熱區，但目前平台沒有任何前端事件追蹤機制
            （沒有記錄使用者瀏覽/點擊了哪個頁面）。要讓這裡顯示真實數據，需要在 app
            端加入事件記錄（例如寫入一個 <b>events</b> 集合），詳見後台彙報。
          </div>
        </div>
      </div>

      <div class="admin-panel">
        <div class="admin-panel-head"><h2>使用者組成</h2></div>
        <div class="admin-panel-body flush admin-table-wrap">
          <table class="admin-table">
            <tbody>
              <tr>
                <td>曾建立賣家/專業檢驗</td>
                <td class="num">{{ loading ? '—' : sellerCount }}</td>
                <td>
                  <div class="admin-bar">
                    <i :style="{ width: ratioWidth(sellerCount, userCount) }" />
                  </div>
                </td>
              </tr>
              <tr>
                <td>曾建立買家複驗</td>
                <td class="num">{{ loading ? '—' : buyerCount }}</td>
                <td>
                  <div class="admin-bar">
                    <i :style="{ width: ratioWidth(buyerCount, userCount) }" />
                  </div>
                </td>
              </tr>
              <tr>
                <td>已登記至少一台車</td>
                <td class="num">{{ loading ? '—' : withVehicleCount }}</td>
                <td class="dim">—</td>
              </tr>
              <tr>
                <td>有自建刊登</td>
                <td class="num">{{ loading ? '—' : withListingCount }}</td>
                <td class="dim">—</td>
              </tr>
              <tr>
                <td>已用過 Probe</td>
                <td class="num">{{ loading ? '—' : withProbeCount }}</td>
                <td class="dim">目前無寫入來源，恆為 0</td>
              </tr>
              <tr>
                <td>7 天未登入</td>
                <td class="num">{{ loading ? '—' : dormant7dCount }}</td>
                <td class="dim">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
