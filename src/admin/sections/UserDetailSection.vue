<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  listAllListings,
  listAllVehicles,
  listAllVerifications,
  listUserProfiles,
  type AdminUserProfile,
} from '../services/admin-data.service'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'

const props = defineProps<{ uid?: string }>()
const router = useRouter()

const loading = ref(true)
const user = ref<AdminUserProfile | null>(null)
const vehicles = ref<Vehicle[]>([])
const listings = ref<MockMarketListing[]>([])
const verifications = ref<Verification[]>([])

const initial = computed(() => (user.value?.displayName || user.value?.email || '?').charAt(0))

function formatDate(ms?: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('zh-TW')
}

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  in_progress: '進行中',
  completed: '已完成',
  needs_review: '待複核',
  expired: '已過期',
}

const TYPE_LABEL: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業檢驗',
}

onMounted(async () => {
  if (!props.uid) {
    loading.value = false
    return
  }
  const [profiles, allVehicles, allListings, allVerifications] = await Promise.all([
    listUserProfiles(),
    listAllVehicles(),
    listAllListings(),
    listAllVerifications(),
  ])
  user.value = profiles.find((u) => u.uid === props.uid) ?? null
  vehicles.value = allVehicles.filter((v) => v.currentOwnerId === props.uid)
  listings.value = allListings.filter((l) => l.vehicleId && l.sellerId === props.uid)
  verifications.value = allVerifications
    .filter((v) => v.userId === props.uid)
    .sort((a, b) => b.createdAt - a.createdAt)
  loading.value = false
})
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel-head">
      <h2>使用者詳情</h2>
      <div class="spacer"></div>
      <button class="admin-btn sm" @click="router.push('/admin/users')">返回名冊</button>
    </div>

    <p v-if="loading" class="admin-page-intro" style="padding: 17px">載入中...</p>
    <p v-else-if="!user" class="admin-page-intro" style="padding: 17px">找不到這個使用者。</p>

    <div v-else class="admin-udetail">
      <div class="admin-uside">
        <div class="admin-uavatar">{{ initial }}</div>
        <div class="admin-uname">{{ user.displayName || '（未設定名稱）' }}</div>
        <div class="admin-ucode">{{ user.email }}</div>

        <dl class="admin-ufacts">
          <div>
            <dt>使用者 ID</dt>
            <dd class="mono">{{ user.uid.slice(0, 12) }}…</dd>
          </div>
          <div>
            <dt>註冊日</dt>
            <dd>{{ formatDate(user.createdAt) }}</dd>
          </div>
          <div>
            <dt>最後活躍</dt>
            <dd>{{ formatDate(user.lastSeenAt) }}</dd>
          </div>
          <div>
            <dt>登記車輛</dt>
            <dd>{{ vehicles.length }}</dd>
          </div>
          <div>
            <dt>自建刊登</dt>
            <dd>{{ listings.length }}</dd>
          </div>
          <div>
            <dt>完成檢驗</dt>
            <dd>{{ verifications.filter((v) => v.status === 'completed').length }}</dd>
          </div>
        </dl>
      </div>

      <div class="admin-umain">
        <div class="admin-usec">
          <h3>登記車輛 <span class="admin-ref app">app 首頁「我的車輛」</span></h3>
          <div v-if="vehicles.length === 0" class="admin-slot">尚無資料</div>
          <div v-else class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>車輛</th>
                  <th>牌照</th>
                  <th>里程</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in vehicles" :key="v.id">
                  <td class="strong">{{ v.brand }} {{ v.model }}</td>
                  <td class="dim">{{ v.licensePlate || '—' }}</td>
                  <td class="num">{{ v.mileage ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-usec">
          <h3>自建刊登 <span class="admin-ref app">app 交易市場「我的刊登」</span></h3>
          <div v-if="listings.length === 0" class="admin-slot">尚無資料</div>
          <div v-else class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>車輛</th>
                  <th class="num">價格</th>
                  <th class="num">收藏數</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in listings" :key="l.id">
                  <td class="strong">
                    {{ l.vehicleSnapshot.brand }} {{ l.vehicleSnapshot.model }}
                  </td>
                  <td class="num">{{ l.priceTwd.toLocaleString() }}</td>
                  <td class="num">{{ l.favoriteCount ?? 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-usec">
          <h3>檢驗紀錄 <span class="admin-ref app">app 檢驗頁</span></h3>
          <div v-if="verifications.length === 0" class="admin-slot">尚無資料</div>
          <table
            v-else
            class="admin-table"
            style="border: 1px solid var(--line); border-radius: 8px; overflow: hidden"
          >
            <thead>
              <tr>
                <th>類型</th>
                <th>日期</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in verifications" :key="v.id">
                <td>{{ TYPE_LABEL[v.type] ?? v.type }}</td>
                <td class="dim">{{ formatDate(v.createdAt) }}</td>
                <td>
                  <span
                    class="admin-pill"
                    :class="
                      v.status === 'completed'
                        ? 'ok'
                        : v.status === 'needs_review'
                          ? 'attn'
                          : 'mute'
                    "
                    >{{ STATUS_LABEL[v.status] ?? v.status }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
