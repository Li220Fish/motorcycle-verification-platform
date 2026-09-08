<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  listSystemAnnouncements,
  sendSystemAnnouncement,
  type SystemAnnouncement,
} from '../services/admin-data.service'

const loading = ref(true)
const announcements = ref<SystemAnnouncement[]>([])
const formOpen = ref(false)
const submitting = ref(false)

const draft = ref({ title: '', body: '' })

function formatCreatedAt(ms: number): string {
  return new Date(ms).toLocaleString('zh-TW')
}

async function reload(): Promise<void> {
  announcements.value = await listSystemAnnouncements()
}

async function handleSend(): Promise<void> {
  if (!draft.value.title.trim() || !draft.value.body.trim()) return
  if (!window.confirm('確定要發送這則系統通知給所有使用者嗎？此操作無法收回。')) return
  submitting.value = true
  try {
    await sendSystemAnnouncement(draft.value.title.trim(), draft.value.body.trim())
    draft.value = { title: '', body: '' }
    formOpen.value = false
    await reload()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await reload()
  loading.value = false
})
</script>

<template>
  <div>
    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>系統通知廣播</h2>
        <div class="spacer"></div>
        <button class="admin-btn sm primary" @click="formOpen = !formOpen">
          {{ formOpen ? '取消' : '發送新通知' }}
        </button>
      </div>

      <div
        v-if="formOpen"
        class="admin-panel-body"
        style="border-bottom: 1px solid var(--line-soft)"
      >
        <p class="dim" style="margin: 0 0 10px">
          發送後會立即出現在每一位使用者的通知中心，無法事後編輯或收回，請確認內容無誤。
        </p>
        <div class="admin-form-row">
          <label class="admin-field"
            ><span>標題</span><input v-model="draft.title" type="text"
          /></label>
        </div>
        <label class="admin-field" style="margin-top: 10px">
          <span>內容</span>
          <textarea v-model="draft.body" rows="4"></textarea>
        </label>
        <button
          class="admin-btn primary"
          style="margin-top: 12px"
          :disabled="submitting"
          @click="handleSend"
        >
          {{ submitting ? '發送中...' : '發送給所有使用者' }}
        </button>
      </div>

      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>標題</th>
              <th>內容</th>
              <th>發送時間</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && announcements.length === 0">
              <td class="admin-empty-cell" colspan="3">尚無發送紀錄</td>
            </tr>
            <tr v-for="a in announcements" :key="a.id">
              <td class="strong">{{ a.title }}</td>
              <td class="dim">{{ a.body }}</td>
              <td class="dim">{{ formatCreatedAt(a.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
