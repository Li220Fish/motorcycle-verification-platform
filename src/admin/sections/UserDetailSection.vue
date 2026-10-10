<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  listAllListings,
  listAllTransactions,
  listAllVehicles,
  listAllVerifications,
  listScoreEvents,
  listUserProfiles,
  type AdminScoreEvent,
  type AdminTransaction,
  type AdminUserProfile,
} from '../services/admin-data.service'
import { sendPasswordReset } from '@/services/firebase/auth.service'
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
const transactions = ref<AdminTransaction[]>([])
const scoreEvents = ref<AdminScoreEvent[]>([])
const displayNameByUid = reactive<Record<string, string>>({})

const SCORE_REASON_LABEL: Record<string, string> = {
  disclosure_comparison: '揭露比對（買賣家複驗差異）',
  appointment_kept: '赴約確認',
}

function counterpartyLabel(t: AdminTransaction): string {
  const counterpartyUid = t.buyerId === props.uid ? t.sellerId : t.buyerId
  return displayNameByUid[counterpartyUid] || counterpartyUid.slice(0, 8)
}

function roleLabel(t: AdminTransaction): string {
  return t.buyerId === props.uid ? '買家' : '賣家'
}

const initial = computed(() => (user.value?.displayName || user.value?.email || '?').charAt(0))

/** 後台看不到、也不會存密碼明文（Firebase Auth 只存單向雜湊，無法反推）——
 *  能幫使用者做的就是觸發官方的忘記密碼信，讓使用者自己設新密碼。 */
const resetState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const resetErrorMessage = ref('')

async function handleResetPassword(): Promise<void> {
  if (!user.value?.email) return
  resetState.value = 'sending'
  resetErrorMessage.value = ''
  try {
    await sendPasswordReset(user.value.email)
    resetState.value = 'sent'
  } catch (error) {
    resetState.value = 'error'
    resetErrorMessage.value = error instanceof Error ? error.message : '寄送失敗，請稍後再試'
  }
}

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
  seller: '車輛驗證',
  buyer: '買家複驗',
  professional: '專業檢驗',
}

onMounted(async () => {
  if (!props.uid) {
    loading.value = false
    return
  }
  const [profiles, allVehicles, allListings, allVerifications, allTransactions, myScoreEvents] =
    await Promise.all([
      listUserProfiles(),
      listAllVehicles(),
      listAllListings(),
      listAllVerifications(),
      listAllTransactions(),
      listScoreEvents(props.uid),
    ])
  user.value = profiles.find((u) => u.uid === props.uid) ?? null
  for (const profile of profiles)
    displayNameByUid[profile.uid] = profile.displayName || profile.email
  vehicles.value = allVehicles.filter((v) => v.currentOwnerId === props.uid)
  listings.value = allListings.filter((l) => l.vehicleId && l.sellerId === props.uid)
  verifications.value = allVerifications
    .filter((v) => v.userId === props.uid)
    .sort((a, b) => b.createdAt - a.createdAt)
  transactions.value = allTransactions
    .filter((t) => t.buyerId === props.uid || t.sellerId === props.uid)
    .sort((a, b) => b.completedAt - a.completedAt)
  scoreEvents.value = myScoreEvents
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

        <button
          class="admin-btn sm"
          style="width: 100%; margin-top: 11px"
          :disabled="resetState === 'sending'"
          @click="handleResetPassword"
        >
          {{ resetState === 'sending' ? '寄送中...' : '重設密碼' }}
        </button>
        <p v-if="resetState === 'sent'" class="admin-reset-msg ok">
          已寄出密碼重設信到 {{ user.email }}
        </p>
        <p v-if="resetState === 'error'" class="admin-reset-msg error">{{ resetErrorMessage }}</p>

        <dl class="admin-ufacts">
          <div>
            <dt>使用者 ID</dt>
            <dd class="mono">{{ user.uid.slice(0, 12) }}…</dd>
          </div>
          <div>
            <dt>評分</dt>
            <dd>{{ user.score }}</dd>
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

        <div class="admin-usec">
          <h3>
            評分紀錄
            <span class="admin-ref app">每筆對應一次 score 增減，見下方「評分」欄位</span>
          </h3>
          <div v-if="scoreEvents.length === 0" class="admin-slot">尚無資料</div>
          <div v-else class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>原因</th>
                  <th class="num">分數變化</th>
                  <th>時間</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in scoreEvents" :key="e.id">
                  <td>{{ SCORE_REASON_LABEL[e.reason] ?? e.reason }}</td>
                  <td class="num" :class="e.delta >= 0 ? 'positive' : 'negative'">
                    {{ e.delta >= 0 ? '+' : '' }}{{ e.delta }}
                  </td>
                  <td class="dim">{{ formatDate(e.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-usec">
          <h3>
            交易紀錄
            <span class="admin-ref app">尚無建立介面 — 僅在有「標記已售出」流程後才會有資料</span>
          </h3>
          <div v-if="transactions.length === 0" class="admin-slot">尚無資料</div>
          <div v-else class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th>對象</th>
                  <th>車輛</th>
                  <th class="num">價格</th>
                  <th>完成日期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in transactions" :key="t.id">
                  <td>{{ roleLabel(t) }}</td>
                  <td class="dim">{{ counterpartyLabel(t) }}</td>
                  <td class="strong">
                    {{
                      t.vehicleSnapshot
                        ? `${t.vehicleSnapshot.brand} ${t.vehicleSnapshot.model}`
                        : '—'
                    }}
                  </td>
                  <td class="num">{{ t.priceTwd != null ? t.priceTwd.toLocaleString() : '—' }}</td>
                  <td class="dim">{{ formatDate(t.completedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
