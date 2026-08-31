<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FileText } from 'lucide-vue-next'

import { homeContentService } from '@/services/firebase/home-content.service'
import type { MockVehicleNews } from '@/data/home/vehicle-news-mock'

const newsItems = ref<MockVehicleNews[]>([])
const noticeMessage = ref('')
function handleNewsClick(): void {
  noticeMessage.value = '車訊內容尚未開放'
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

onMounted(async () => {
  newsItems.value = await homeContentService.listVehicleNews()
})
</script>

<template>
  <div class="section">
    <div class="section-header">
      <h2>車訊新知</h2>
    </div>
    <div class="news-list">
      <button v-for="news in newsItems" :key="news.id" class="news-row" @click="handleNewsClick">
        <div class="icon-wrap"><FileText :size="20" color="var(--color-text-disabled)" /></div>
        <div class="news-info">
          <p class="title">{{ news.title }}</p>
          <p class="meta">
            <span class="category-tag">{{ news.category }}</span>
            {{ news.source }} · {{ news.relativeTime }}
          </p>
        </div>
      </button>
    </div>
    <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>
  </div>
</template>

<style scoped>
.section {
  padding: 0 var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.news-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.icon-wrap {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.news-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--color-text-secondary);
}

.category-tag {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  border-radius: 999px;
  padding: 1px 8px;
}

.notice {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
