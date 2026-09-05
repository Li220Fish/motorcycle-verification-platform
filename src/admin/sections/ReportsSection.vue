<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { listAllVerifications } from '../services/admin-data.service'
import type { Verification } from '@/types/verification'

const loading = ref(true)
const verifications = ref<Verification[]>([])

const TYPE_LABEL: Record<string, string> = {
  seller: '賣家驗證',
  buyer: '買家複驗',
  professional: '專業檢驗',
}

const byType = computed(() => {
  const types = ['seller', 'buyer', 'professional']
  return types.map((type) => {
    const rows = verifications.value.filter((v) => v.type === type)
    const completed = rows.filter((v) => v.status === 'completed').length
    const needsReview = rows.filter((v) => v.status === 'needs_review').length
    const expired = rows.filter((v) => v.status === 'expired').length
    return { type, total: rows.length, completed, needsReview, expired }
  })
})

onMounted(async () => {
  verifications.value = await listAllVerifications()
  loading.value = false
})
</script>

<template>
  <div>
    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>各類型完成狀況</h2>
        <span class="sub">全期間累計</span>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>類型</th>
              <th class="num">已完成</th>
              <th class="num">待複核</th>
              <th class="num">已過期</th>
              <th>備註</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td class="admin-empty-cell" colspan="5">載入中...</td>
            </tr>
            <tr v-for="row in byType" :key="row.type">
              <td class="strong">{{ TYPE_LABEL[row.type] }}</td>
              <td class="num dim">{{ row.completed }}</td>
              <td class="num dim">{{ row.needsReview }}</td>
              <td class="num dim">{{ row.expired }}</td>
              <td class="dim">共 {{ row.total }} 筆</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

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
        <h4>分類別（電系／車體／引擎…）品質率尚未實作</h4>
        <p>
          原設計要看每個檢驗分類（電系判讀、車體檢查、引擎聲學…）各自的「良好／注意／需確認」比例，
          這需要解析每筆檢驗的 <code>answers</code> / <code>evidence</code> 子集合並對應到分類定義，
          目前後台只彙總了「整體狀態」（已完成／待複核／已過期），還沒有做到分類別拆解。
          若要支援，建議在 <code>verifications</code> 文件上新增一個彙總欄位（例如
          <code>categoryResults</code
          >），在完成檢驗時一併寫入，而不是每次都在後台重新解析全部子集合。
        </p>
      </div>
    </div>
  </div>
</template>
