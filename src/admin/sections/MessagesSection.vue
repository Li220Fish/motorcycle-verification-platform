<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  listAllConversations,
  listAllReports,
  listUserProfiles,
  resolveReport,
  syncConversationMemberNames,
  type AdminReport,
  type AdminUserProfile,
} from '../services/admin-data.service'
import type { Conversation } from '@/services/chat/chat.types'

const loading = ref(true)
const conversations = ref<Conversation[]>([])
const reports = ref<AdminReport[]>([])
const users = ref<AdminUserProfile[]>([])
const resolving = ref<string | null>(null)
const syncingNames = ref(false)
const syncNamesResult = ref('')

async function handleSyncNames(): Promise<void> {
  syncingNames.value = true
  syncNamesResult.value = ''
  try {
    const { conversationsScanned, conversationsUpdated } = await syncConversationMemberNames()
    syncNamesResult.value = `已掃描 ${conversationsScanned} 筆對話，修正 ${conversationsUpdated} 筆顯示名稱`
  } catch {
    syncNamesResult.value = '同步失敗，請稍後再試'
  } finally {
    syncingNames.value = false
  }
}

const userReports = computed(() => reports.value.filter((r) => r.targetType === 'user'))

function nameOf(uid: string): string {
  return users.value.find((u) => u.uid === uid)?.displayName || uid.slice(0, 8)
}

async function handleResolve(reportId: string): Promise<void> {
  resolving.value = reportId
  try {
    await resolveReport(reportId)
    const report = reports.value.find((r) => r.id === reportId)
    if (report) report.status = 'resolved'
  } finally {
    resolving.value = null
  }
}

onMounted(async () => {
  const [allConversations, allReports, allUsers] = await Promise.all([
    listAllConversations(),
    listAllReports(),
    listUserProfiles(),
  ])
  conversations.value = allConversations
  reports.value = allReports.sort((a, b) => b.createdAt - a.createdAt)
  users.value = allUsers
  loading.value = false
})
</script>

<template>
  <div>
    <dl class="admin-strip">
      <div>
        <dt>總對話數</dt>
        <dd>{{ loading ? '—' : conversations.length }}</dd>
        <div class="note">本期累計</div>
      </div>
      <div>
        <dt>由刊登發起</dt>
        <dd>{{ loading ? '—' : conversations.filter((c) => c.context?.listingId).length }}</dd>
        <div class="note">排除代訂測試對話</div>
      </div>
      <div>
        <dt>賣家有回覆</dt>
        <dd>—</dd>
        <div class="note">需逐訊息分析，尚未實作</div>
      </div>
      <div>
        <dt>檢舉待處理</dt>
        <dd>{{ loading ? '—' : userReports.filter((r) => r.status === 'pending').length }}</dd>
        <div class="note">來自使用者檢舉</div>
      </div>
    </dl>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>聊天顯示名稱同步</h2>
        <span class="sub">修正 memberSnapshots 與使用者目前顯示名稱不一致的對話</span>
      </div>
      <div class="admin-panel-body">
        <p class="dim" style="margin: 0 0 12px">
          聊天室的對話對象名稱會在建立對話時凍結一份快照，若對方之後改名或原始名稱來源有誤，
          既有對話不會自動更新——點下方按鈕會掃描所有對話並修正成目前的真實顯示名稱（可重複執行，不會影響已經正確的對話）。
        </p>
        <button class="admin-btn sm" :disabled="syncingNames" @click="handleSyncNames">
          {{ syncingNames ? '同步中...' : '立即同步聊天顯示名稱' }}
        </button>
        <p v-if="syncNamesResult" class="dim" style="margin: 8px 0 0">{{ syncNamesResult }}</p>
      </div>
    </div>

    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>檢舉與稽核</h2>
        <span class="sub">discussionReports · targetType = user</span>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>檢舉理由</th>
              <th>檢舉人</th>
              <th>被檢舉人</th>
              <th>時間</th>
              <th>狀態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && userReports.length === 0">
              <td class="admin-empty-cell" colspan="6">尚無檢舉紀錄</td>
            </tr>
            <tr v-for="r in userReports" :key="r.id">
              <td class="strong">{{ r.reason }}</td>
              <td class="dim">{{ nameOf(r.reporterId) }}</td>
              <td class="dim">{{ nameOf(r.targetId) }}</td>
              <td class="dim">{{ new Date(r.createdAt).toLocaleString('zh-TW') }}</td>
              <td>
                <span class="admin-pill" :class="r.status === 'pending' ? 'risk' : 'ok'">{{
                  r.status === 'pending' ? '待處理' : '已結案'
                }}</span>
              </td>
              <td>
                <button
                  v-if="r.status === 'pending'"
                  class="admin-btn sm"
                  :disabled="resolving === r.id"
                  @click="handleResolve(r.id)"
                >
                  標記已處理
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
