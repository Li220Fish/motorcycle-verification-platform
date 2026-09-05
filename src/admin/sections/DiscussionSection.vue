<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  dismissReport,
  hidePost,
  listAllPosts,
  listAllReports,
  listUserProfiles,
  resolveReport,
  type AdminReport,
  type AdminUserProfile,
} from '../services/admin-data.service'
import type { DiscussionPost, PostStatus } from '@/services/discussion/discussion.types'

const loading = ref(true)
const posts = ref<DiscussionPost[]>([])
const reports = ref<AdminReport[]>([])
const users = ref<AdminUserProfile[]>([])
const resolving = ref<string | null>(null)
const hiding = ref<string | null>(null)

const STATUS_LABEL: Record<PostStatus, string> = {
  active: '已發布',
  hidden: '已隱藏',
  deleted: '已刪除',
}

const contentReports = computed(() =>
  reports.value.filter((r) => r.targetType === 'post' || r.targetType === 'comment'),
)

const byCategory = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value) map.set(p.category, (map.get(p.category) ?? 0) + 1)
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})

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

async function handleDismiss(reportId: string): Promise<void> {
  resolving.value = reportId
  try {
    await dismissReport(reportId)
    const report = reports.value.find((r) => r.id === reportId)
    if (report) report.status = 'dismissed'
  } finally {
    resolving.value = null
  }
}

async function handleHide(postId: string): Promise<void> {
  hiding.value = postId
  try {
    await hidePost(postId)
    const post = posts.value.find((p) => p.id === postId)
    if (post) post.status = 'hidden'
  } finally {
    hiding.value = null
  }
}

onMounted(async () => {
  const [allPosts, allReports, allUsers] = await Promise.all([
    listAllPosts(),
    listAllReports(),
    listUserProfiles(),
  ])
  posts.value = allPosts.sort((a, b) => b.createdAt - a.createdAt)
  reports.value = allReports.sort((a, b) => b.createdAt - a.createdAt)
  users.value = allUsers
  loading.value = false
})
</script>

<template>
  <div>
    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>貼文管理</h2>
        <span class="sub">{{ posts.length }} 篇</span>
      </div>
      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>標題</th>
              <th>作者</th>
              <th>分類</th>
              <th class="num">讚</th>
              <th class="num">留言</th>
              <th>狀態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && posts.length === 0">
              <td class="admin-empty-cell" colspan="7">尚無資料</td>
            </tr>
            <tr v-for="p in posts" :key="p.id">
              <td class="strong">{{ p.title }}</td>
              <td class="dim">{{ p.authorSnapshot.displayName }}</td>
              <td>{{ p.category }}</td>
              <td class="num dim">{{ p.likeCount }}</td>
              <td class="num dim">{{ p.commentCount }}</td>
              <td>
                <span class="admin-pill" :class="p.status === 'active' ? 'ok' : 'mute'">
                  {{ STATUS_LABEL[p.status] }}
                </span>
              </td>
              <td>
                <button
                  v-if="p.status === 'active'"
                  class="admin-btn sm"
                  :disabled="hiding === p.id"
                  @click="handleHide(p.id)"
                >
                  隱藏
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-split">
      <div class="admin-panel">
        <div class="admin-panel-head"><h2>分類貼文量</h2></div>
        <div class="admin-panel-body flush admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>分類</th>
                <th class="num">貼文數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!loading && byCategory.length === 0">
                <td class="admin-empty-cell" colspan="2">尚無資料</td>
              </tr>
              <tr v-for="[category, count] in byCategory" :key="category">
                <td class="strong">{{ category }}</td>
                <td class="num dim">{{ count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-panel">
        <div class="admin-panel-head"><h2>檢舉與稽核</h2></div>
        <div class="admin-panel-body flush admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>內容</th>
                <th>理由</th>
                <th class="num">檢舉人</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!loading && contentReports.length === 0">
                <td class="admin-empty-cell" colspan="4">尚無檢舉紀錄</td>
              </tr>
              <tr v-for="r in contentReports" :key="r.id">
                <td class="mono dim">{{ r.targetId.slice(0, 10) }}…</td>
                <td>{{ r.reason }}</td>
                <td class="num dim">{{ nameOf(r.reporterId) }}</td>
                <td>
                  <template v-if="r.status === 'pending'">
                    <button
                      class="admin-btn sm"
                      :disabled="resolving === r.id"
                      @click="handleResolve(r.id)"
                    >
                      標記已處理
                    </button>
                    <button
                      class="admin-btn sm"
                      :disabled="resolving === r.id"
                      @click="handleDismiss(r.id)"
                    >
                      駁回
                    </button>
                  </template>
                  <span v-else class="admin-pill ok">{{
                    r.status === 'dismissed' ? '已駁回' : '已結案'
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
