<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  createVehicleNews,
  deleteVehicleNews,
  listAllVehicleNews,
} from '../services/admin-data.service'
import type { MockVehicleNews } from '@/data/home/vehicle-news-mock'

const loading = ref(true)
const news = ref<MockVehicleNews[]>([])
const formOpen = ref(false)
const submitting = ref(false)

const draft = ref({ title: '', category: '', sourceName: '', content: '' })

function formatPublishedAt(ms: number): string {
  return new Date(ms).toLocaleString('zh-TW')
}

async function reload(): Promise<void> {
  news.value = await listAllVehicleNews()
}

async function handleCreate(): Promise<void> {
  if (!draft.value.title.trim() || !draft.value.content.trim()) return
  submitting.value = true
  try {
    await createVehicleNews({
      title: draft.value.title.trim(),
      category: draft.value.category.trim() || '一般',
      sourceName: draft.value.sourceName.trim() || 'MotoVerify 編輯部',
      content: draft.value.content.trim(),
    })
    draft.value = { title: '', category: '', sourceName: '', content: '' }
    formOpen.value = false
    await reload()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string): Promise<void> {
  await deleteVehicleNews(id)
  await reload()
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
        <h2>文章</h2>
        <div class="spacer"></div>
        <button class="admin-btn sm primary" @click="formOpen = !formOpen">
          {{ formOpen ? '取消' : '新增文章' }}
        </button>
      </div>

      <div
        v-if="formOpen"
        class="admin-panel-body"
        style="border-bottom: 1px solid var(--line-soft)"
      >
        <div class="admin-form-row">
          <label class="admin-field"
            ><span>標題</span><input v-model="draft.title" type="text"
          /></label>
        </div>
        <div class="admin-form-row" style="margin-top: 10px">
          <label class="admin-field"
            ><span>分類</span
            ><input v-model="draft.category" type="text" placeholder="政策 / 新車 / 安全"
          /></label>
          <label class="admin-field"
            ><span>來源</span><input v-model="draft.sourceName" type="text"
          /></label>
        </div>
        <label class="admin-field" style="margin-top: 10px">
          <span>內文</span>
          <textarea v-model="draft.content" rows="5"></textarea>
        </label>
        <button
          class="admin-btn primary"
          style="margin-top: 12px"
          :disabled="submitting"
          @click="handleCreate"
        >
          {{ submitting ? '發布中...' : '發布' }}
        </button>
      </div>

      <div class="admin-panel-body flush admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>標題</th>
              <th>分類</th>
              <th>來源</th>
              <th>發布</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && news.length === 0">
              <td class="admin-empty-cell" colspan="5">尚無資料</td>
            </tr>
            <tr v-for="n in news" :key="n.id">
              <td class="strong">{{ n.title }}</td>
              <td>
                <span class="admin-pill info">{{ n.category }}</span>
              </td>
              <td class="dim">{{ n.sourceName }}</td>
              <td class="dim">{{ formatPublishedAt(n.publishedAt) }}</td>
              <td><button class="admin-btn sm danger" @click="handleDelete(n.id)">刪除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
