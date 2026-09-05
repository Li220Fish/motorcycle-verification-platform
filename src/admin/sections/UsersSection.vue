<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  listAllListings,
  listAllVehicles,
  listAllVerifications,
  listUserProfiles,
  type AdminUserProfile,
} from '../services/admin-data.service'

const emit = defineEmits<{ 'open-user': [string] }>()

const loading = ref(true)
const search = ref('')
const users = ref<AdminUserProfile[]>([])
const vehicleCountByUid = ref<Record<string, number>>({})
const listingCountByUid = ref<Record<string, number>>({})
const verificationCountByUid = ref<Record<string, number>>({})

function countBy<T>(items: T[], keyOf: (item: T) => string | undefined): Record<string, number> {
  const map: Record<string, number> = {}
  for (const item of items) {
    const key = keyOf(item)
    if (!key) continue
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(
    (u) => (u.displayName ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  )
})

function formatDate(ms: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('zh-TW')
}

onMounted(async () => {
  const [profiles, vehicles, listings, verifications] = await Promise.all([
    listUserProfiles(),
    listAllVehicles(),
    listAllListings(),
    listAllVerifications(),
  ])
  users.value = profiles.sort((a, b) => b.createdAt - a.createdAt)
  vehicleCountByUid.value = countBy(vehicles, (v) => v.currentOwnerId)
  listingCountByUid.value = countBy(
    listings.filter((l) => l.vehicleId),
    (l) => l.sellerId,
  )
  verificationCountByUid.value = countBy(verifications, (v) => v.userId)
  loading.value = false
})
</script>

<template>
  <div>
    <p class="admin-page-intro">
      Firebase Auth 本身不提供前端可用的「列出所有使用者」API（只有 Admin SDK
      能列舉帳號，而本專案刻意不使用 Admin SDK / service
      account）。此名冊改為讀取每位使用者登入時寫入的
      <code>users/&#123;uid&#125;</code> 個人檔案——只有 2026-09-03 之後登入過的帳號才會出現在這裡，
      舊帳號會在下次登入時自動補上。
    </p>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>使用者</h2>
        <span class="sub">{{ users.length }}</span>
        <div class="spacer"></div>
        <input v-model="search" class="admin-search" type="search" placeholder="搜尋名稱或 email" />
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>名稱</th>
              <th>Email</th>
              <th class="num">登記車輛</th>
              <th class="num">自建刊登</th>
              <th class="num">完成檢驗</th>
              <th>最後活躍</th>
              <th>加入日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0">
              <td class="admin-empty-cell" colspan="7">尚無資料</td>
            </tr>
            <tr
              v-for="u in filtered"
              :key="u.uid"
              class="clickable"
              @click="emit('open-user', u.uid)"
            >
              <td class="strong">{{ u.displayName || '（未設定名稱）' }}</td>
              <td class="dim">{{ u.email }}</td>
              <td class="num">{{ vehicleCountByUid[u.uid] ?? 0 }}</td>
              <td class="num">{{ listingCountByUid[u.uid] ?? 0 }}</td>
              <td class="num">{{ verificationCountByUid[u.uid] ?? 0 }}</td>
              <td class="dim">{{ u.lastSeenAt ? formatDate(u.lastSeenAt) : '—' }}</td>
              <td class="dim">{{ formatDate(u.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
