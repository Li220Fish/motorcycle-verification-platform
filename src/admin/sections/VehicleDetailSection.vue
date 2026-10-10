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

const props = defineProps<{ id?: string }>()
const router = useRouter()

const loading = ref(true)
const vehicle = ref<Vehicle | null>(null)
const owner = ref<AdminUserProfile | null>(null)
const verifications = ref<Verification[]>([])

const TYPE_LABEL: Record<string, string> = {
  seller: '車輛驗證',
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
const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  passed: '已通過',
  failed: '未通過',
}

function formatDate(ms?: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-TW')
}

function registrationStatusLabel(): string {
  const status = vehicle.value?.registrationVerification?.status
  return status ? (REGISTRATION_STATUS_LABEL[status] ?? status) : '尚未驗證'
}

const vehicleVerifications = computed(() =>
  [...verifications.value].sort((a, b) => b.createdAt - a.createdAt),
)

/** 同一台車歷次驗證回填的里程數字小於前一次——跟 GarageSection.vue 列表頁
 *  同一個判斷邏輯，這裡只算這台車自己的歷史。 */
const hasOdoAnomaly = computed(() => {
  const history = verifications.value
    .filter((v) => typeof v.mileage === 'number')
    .sort((a, b) => a.createdAt - b.createdAt)
  for (let i = 1; i < history.length; i += 1) {
    if ((history[i].mileage as number) < (history[i - 1].mileage as number)) return true
  }
  return false
})

function openVerification(id: string): void {
  router.push(`/admin/verifications/${id}`)
}

function openOwner(): void {
  if (vehicle.value?.currentOwnerId) router.push(`/admin/users/${vehicle.value.currentOwnerId}`)
}

onMounted(async () => {
  if (!props.id) {
    loading.value = false
    return
  }
  const [allVehicles, allUsers, allVerifications] = await Promise.all([
    listAllVehicles(),
    listUserProfiles(),
    listAllVerifications(),
  ])
  const found = allVehicles.find((v) => v.id === props.id) ?? null
  vehicle.value = found
  owner.value = found ? (allUsers.find((u) => u.uid === found.currentOwnerId) ?? null) : null
  verifications.value = found ? allVerifications.filter((v) => v.vehicleId === found.id) : []
  loading.value = false
})
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel-head">
      <h2>車輛詳情</h2>
      <div class="spacer"></div>
      <button class="admin-btn sm" @click="router.push('/admin/garage')">返回車輛列表</button>
    </div>

    <p v-if="loading" class="admin-page-intro" style="padding: 17px">載入中...</p>
    <p v-else-if="!vehicle" class="admin-page-intro" style="padding: 17px">找不到這台車輛。</p>

    <div v-else class="admin-udetail">
      <div class="admin-uside">
        <div class="admin-uname">{{ vehicle.brand }} {{ vehicle.model }}</div>
        <div class="admin-ucode clickable" @click="openOwner">
          {{ owner?.displayName || owner?.email || vehicle.currentOwnerId.slice(0, 8) }}
        </div>

        <dl class="admin-ufacts">
          <div>
            <dt>車輛 ID</dt>
            <dd class="mono">{{ vehicle.id.slice(0, 12) }}…</dd>
          </div>
          <div>
            <dt>牌照</dt>
            <dd>{{ vehicle.licensePlate || '—' }}</dd>
          </div>
          <div>
            <dt>引擎號碼</dt>
            <dd>{{ vehicle.engineNumber || '—' }}</dd>
          </div>
          <div>
            <dt>車身號碼</dt>
            <dd>{{ vehicle.chassisNumber || '—' }}</dd>
          </div>
          <div>
            <dt>里程</dt>
            <dd>{{ vehicle.mileage ?? '—' }}</dd>
          </div>
          <div>
            <dt>里程異常</dt>
            <dd>
              <span class="admin-pill" :class="hasOdoAnomaly ? 'risk' : 'ok'">
                {{ hasOdoAnomaly ? '是' : '否' }}
              </span>
            </dd>
          </div>
          <div>
            <dt>行照驗證</dt>
            <dd>
              <span
                class="admin-pill"
                :class="{
                  ok: vehicle.registrationVerification?.status === 'passed',
                  risk: vehicle.registrationVerification?.status === 'failed',
                  mute: !vehicle.registrationVerification,
                }"
              >
                {{ registrationStatusLabel() }}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div class="admin-umain">
        <div class="admin-usec">
          <h3>行照照片 <span class="admin-ref app">app 行照驗證卡片</span></h3>
          <div v-if="!vehicle.registrationDocumentUrl" class="admin-slot">尚無上傳</div>
          <template v-else>
            <div class="document-photo-grid">
              <div>
                <p class="document-photo-label">遮罩版（個資已遮蔽，正式畫面只會顯示這張）</p>
                <a
                  v-if="vehicle.registrationDocumentMaskedUrl"
                  :href="vehicle.registrationDocumentMaskedUrl"
                  target="_blank"
                  rel="noopener"
                >
                  <img
                    :src="vehicle.registrationDocumentMaskedUrl"
                    alt="行照照片（遮罩版）"
                    class="document-photo"
                  />
                </a>
                <div v-else class="admin-slot">本機角點偵測失敗，沒有遮罩版可顯示</div>
              </div>
              <div>
                <p class="document-photo-label">原圖（暫時保留比對用，之後會移除）</p>
                <a :href="vehicle.registrationDocumentUrl" target="_blank" rel="noopener">
                  <img
                    :src="vehicle.registrationDocumentUrl"
                    alt="行照照片（原圖）"
                    class="document-photo"
                  />
                </a>
              </div>
            </div>
            <dl class="admin-ufacts" style="margin-top: 12px">
              <div>
                <dt>OCR 引擎號碼</dt>
                <dd>{{ vehicle.registrationVerification?.ocrEngineNumber || '—' }}</dd>
              </div>
              <div>
                <dt>信心度</dt>
                <dd>
                  {{
                    vehicle.registrationVerification?.confidence != null
                      ? `${(vehicle.registrationVerification.confidence * 100).toFixed(0)}%`
                      : '—'
                  }}
                </dd>
              </div>
              <div>
                <dt>辨識引擎</dt>
                <dd>
                  <span
                    v-if="vehicle.registrationVerification?.method"
                    class="admin-pill"
                    :class="vehicle.registrationVerification.method === 'local' ? 'attn' : 'mute'"
                  >
                    {{
                      vehicle.registrationVerification.method === 'local'
                        ? '本機備援（Gemini 失敗）'
                        : 'Gemini'
                    }}
                  </span>
                  <span v-else>—</span>
                </dd>
              </div>
              <div>
                <dt>驗證時間</dt>
                <dd>{{ formatDate(vehicle.registrationVerification?.verifiedAt) }}</dd>
              </div>
              <div v-if="vehicle.registrationVerification?.note">
                <dt>備註</dt>
                <dd>{{ vehicle.registrationVerification.note }}</dd>
              </div>
            </dl>
          </template>
        </div>

        <div class="admin-usec">
          <h3>檢驗紀錄 <span class="admin-ref app">app 檢驗頁</span></h3>
          <div v-if="vehicleVerifications.length === 0" class="admin-slot">尚無資料</div>
          <div v-else class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>類型</th>
                  <th>日期</th>
                  <th>里程</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="v in vehicleVerifications"
                  :key="v.id"
                  class="clickable"
                  @click="openVerification(v.id)"
                >
                  <td>{{ TYPE_LABEL[v.type] ?? v.type }}</td>
                  <td class="dim">{{ formatDate(v.createdAt) }}</td>
                  <td class="num">{{ v.mileage ?? '—' }}</td>
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

        <div class="admin-note">
          里程數字用於驗證<b>車輛存在性</b>，不用於估算車況——中古車在轉手或儀表板維修時本來就可能歸零重計，
          異常仍歸為車主自報，設計上未強制攔截或篡改判定車輛資格。
        </div>
      </div>
    </div>
  </div>
</template>
