<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import { homeContentService } from '@/services/firebase/home-content.service'
import { formatRelativeTime } from '@/utils/format-time'
import type { MockVehicleNews } from '@/data/home/vehicle-news-mock'

const props = defineProps<{ newsId: string }>()

const news = ref<MockVehicleNews | null>(null)
const loaded = ref(false)

onMounted(async () => {
  news.value = await homeContentService.getVehicleNews(props.newsId).catch(() => null)
  loaded.value = true
})
</script>

<template>
  <div>
    <AppHeader title="車訊新知" back />

    <div v-if="!loaded" class="loading">載入中...</div>
    <div v-else-if="!news" class="loading">找不到這則消息</div>

    <div v-else class="scroll">
      <div class="post-card">
        <div class="top">
          <span class="category-tag">{{ news.category }}</span>
          <span class="source">{{ news.sourceName }}</span>
          <span class="time">· {{ formatRelativeTime(news.publishedAt) }}</span>
        </div>
        <p class="title">{{ news.title }}</p>
        <p class="body">{{ news.content }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--space-lg) 0;
}

.scroll {
  padding: var(--space-md);
  padding-bottom: 90px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.post-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-tag {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  border-radius: 999px;
  padding: 2px 9px;
}

.source {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.time {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.body {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
