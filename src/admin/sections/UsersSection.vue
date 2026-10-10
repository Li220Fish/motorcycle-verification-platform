<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  deleteUserCascade,
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

// Row-selection delete mode — off by default so a stray click never selects
// anything; toggled on by "刪除" the same way most admin bulk-actions do.
const selecting = ref(false)
const selectedUids = ref<Set<string>>(new Set())
const deleting = ref(false)

const allFilteredSelected = computed(
  () => filtered.value.length > 0 && filtered.value.every((u) => selectedUids.value.has(u.uid)),
)

function toggleSelecting(): void {
  selecting.value = !selecting.value
  if (!selecting.value) selectedUids.value = new Set()
}

function toggleSelectAll(): void {
  selectedUids.value = allFilteredSelected.value
    ? new Set()
    : new Set(filtered.value.map((u) => u.uid))
}

function toggleSelectOne(uid: string): void {
  const next = new Set(selectedUids.value)
  if (next.has(uid)) next.delete(uid)
  else next.add(uid)
  selectedUids.value = next
}

async function handleDeleteSelected(): Promise<void> {
  const targets = users.value.filter((u) => selectedUids.value.has(u.uid))
  if (targets.length === 0) return
  const preview = targets
    .slice(0, 5)
    .map((u) => u.email || u.uid)
    .join('、')
  const suffix = targets.length > 5 ? ` 等共 ${targets.length} 位` : ''
  if (
    !window.confirm(
      `刪除 ${preview}${suffix} 的帳號？\n\n` +
        `會一併刪除其名下的車輛、驗車紀錄、刊登、貼文與留言，但不會刪除其 Firebase Auth 帳號本身（無法從前端以 admin 身分代刪他人帳號）。此操作無法復原。`,
    )
  ) {
    return
  }
  deleting.value = true
  try {
    const totals = { vehicles: 0, verifications: 0, listings: 0, posts: 0, comments: 0 }
    for (const u of targets) {
      const summary = await deleteUserCascade(u.uid)
      totals.vehicles += summary.vehicles
      totals.verifications += summary.verifications
      totals.listings += summary.listings
      totals.posts += summary.posts
      totals.comments += summary.comments
    }
    const deletedUids = new Set(targets.map((u) => u.uid))
    users.value = users.value.filter((u) => !deletedUids.has(u.uid))
    selectedUids.value = new Set()
    selecting.value = false
    window.alert(
      `已刪除 ${targets.length} 位使用者，一併移除：車輛 ${totals.vehicles}、驗車紀錄 ${totals.verifications}、刊登 ${totals.listings}、貼文 ${totals.posts}、留言 ${totals.comments}。`,
    )
  } finally {
    deleting.value = false
  }
}

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
        <span v-if="selecting && selectedUids.size > 0" class="sub"
          >已選 {{ selectedUids.size }}</span
        >
        <button
          v-if="selecting"
          class="admin-btn danger sm"
          :disabled="selectedUids.size === 0 || deleting"
          @click="handleDeleteSelected"
        >
          {{ deleting ? '刪除中…' : '刪除' }}
        </button>
        <button class="admin-btn sm" @click="toggleSelecting">
          {{ selecting ? '取消' : '刪除帳號' }}
        </button>
        <input v-model="search" class="admin-search" type="search" placeholder="搜尋名稱或 email" />
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th v-if="selecting" class="admin-check-col">
                <input type="checkbox" :checked="allFilteredSelected" @change="toggleSelectAll" />
              </th>
              <th>名稱</th>
              <th>Email</th>
              <th class="num">評分</th>
              <th class="num">登記車輛</th>
              <th class="num">自建刊登</th>
              <th class="num">完成檢驗</th>
              <th>最後活躍</th>
              <th>加入日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0">
              <td class="admin-empty-cell" :colspan="selecting ? 9 : 8">尚無資料</td>
            </tr>
            <tr
              v-for="u in filtered"
              :key="u.uid"
              class="clickable"
              @click="selecting ? toggleSelectOne(u.uid) : emit('open-user', u.uid)"
            >
              <td v-if="selecting" class="admin-check-col" @click.stop="toggleSelectOne(u.uid)">
                <input
                  type="checkbox"
                  :checked="selectedUids.has(u.uid)"
                  @change="toggleSelectOne(u.uid)"
                />
              </td>
              <td class="strong">{{ u.displayName || '（未設定名稱）' }}</td>
              <td class="dim">{{ u.email }}</td>
              <td class="num">{{ u.score }}</td>
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

<style scoped>
.admin-check-col {
  width: 32px;
  text-align: center;
}
</style>
