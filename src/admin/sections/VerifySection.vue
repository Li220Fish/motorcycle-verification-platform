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
const verifications = ref<Verification[]>([])
const vehicles = ref<Vehicle[]>([])
const users = ref<AdminUserProfile[]>([])
const filter = ref<'all' | 'seller' | 'buyer'>('all')

const TYPE_LABEL: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業檢驗',
}
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  in_progress: '進行中',
  completed: '已完成',
  needs_review: '待複核',
  expired: '已過期',
}

function vehicleLabel(vehicleId: string): string {
  const v = vehicles.value.find((x) => x.id === vehicleId)
  return v ? `${v.brand} ${v.model}` : '（找不到車輛）'
}
function userLabel(userId: string): string {
  return users.value.find((u) => u.uid === userId)?.displayName || userId.slice(0, 8)
}
function vehicleExists(vehicleId: string): boolean {
  return vehicles.value.some((v) => v.id === vehicleId)
}
function openVerification(id: string): void {
  router.push(`/admin/verifications/${id}`)
}

const monthCount = computed(() => {
  const now = new Date()
  return verifications.value.filter((v) => {
    const d = new Date(v.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
})
const pendingCount = computed(
  () =>
    verifications.value.filter((v) => v.status === 'needs_review' || v.status === 'in_progress')
      .length,
)
const avgDurationMinutes = computed(() => {
  const completed = verifications.value.filter((v) => v.status === 'completed' && v.completedAt)
  if (completed.length === 0) return null
  const totalMs = completed.reduce((sum, v) => sum + (v.completedAt! - v.createdAt), 0)
  return Math.round(totalMs / completed.length / 60000)
})
const orphanCount = computed(
  () => verifications.value.filter((v) => !vehicleExists(v.vehicleId)).length,
)

const filtered = computed(() => {
  if (filter.value === 'all') return verifications.value
  return verifications.value.filter((v) =>
    filter.value === 'seller'
      ? v.type === 'seller' || v.type === 'professional'
      : v.type === 'buyer',
  )
})

onMounted(async () => {
  const [allVerifications, allVehicles, allUsers] = await Promise.all([
    listAllVerifications(),
    listAllVehicles(),
    listUserProfiles(),
  ])
  verifications.value = allVerifications.sort((a, b) => b.createdAt - a.createdAt)
  vehicles.value = allVehicles
  users.value = allUsers
  loading.value = false
})
</script>

<template>
  <div>
    <dl class="admin-strip">
      <div>
        <dt>本月檢驗</dt>
        <dd>{{ loading ? '—' : monthCount }}</dd>
        <div class="note">賣家驗證＋買家複驗</div>
      </div>
      <div>
        <dt>待複核</dt>
        <dd>{{ loading ? '—' : pendingCount }}</dd>
        <div class="note">完成度不足或待人工確認</div>
      </div>
      <div>
        <dt>平均完成時間</dt>
        <dd>{{ loading || avgDurationMinutes === null ? '—' : `${avgDurationMinutes} 分` }}</dd>
        <div class="note">依 createdAt→completedAt 計算</div>
      </div>
      <div>
        <dt>中斷放棄率</dt>
        <dd>—</dd>
        <div class="note">需要逐步驟事件才能計算</div>
      </div>
      <div>
        <dt>未選車輛</dt>
        <dd>{{ loading ? '—' : orphanCount }}</dd>
        <div class="note">關聯的車輛已不存在</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>複核佇列</h2>
        <div class="spacer"></div>
        <div class="admin-filters">
          <button class="admin-chip" :class="{ active: filter === 'all' }" @click="filter = 'all'">
            全部
          </button>
          <button
            class="admin-chip"
            :class="{ active: filter === 'seller' }"
            @click="filter = 'seller'"
          >
            賣家驗證
          </button>
          <button
            class="admin-chip"
            :class="{ active: filter === 'buyer' }"
            @click="filter = 'buyer'"
          >
            買家複驗
          </button>
        </div>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>車輛</th>
              <th>提交者</th>
              <th>類型</th>
              <th>日期</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0">
              <td class="admin-empty-cell" colspan="5">尚無資料</td>
            </tr>
            <tr v-for="v in filtered" :key="v.id" class="clickable" @click="openVerification(v.id)">
              <td class="strong">{{ vehicleLabel(v.vehicleId) }}</td>
              <td class="dim">{{ userLabel(v.userId) }}</td>
              <td>{{ TYPE_LABEL[v.type] ?? v.type }}</td>
              <td class="dim">{{ new Date(v.createdAt).toLocaleDateString('zh-TW') }}</td>
              <td>
                <span
                  class="admin-pill"
                  :class="
                    v.status === 'completed' ? 'ok' : v.status === 'needs_review' ? 'attn' : 'mute'
                  "
                  >{{ STATUS_LABEL[v.status] ?? v.status }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-note">
      「中斷放棄率」與各步驟漏斗需要
      <code>verification_start</code> 到各步驟完成的事件序列才能計算，
      目前平台沒有步驟層級的事件記錄，僅有最終狀態（draft/in_progress/completed/needs_review/expired）。
    </div>
  </div>
</template>
