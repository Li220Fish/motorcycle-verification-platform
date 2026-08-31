<script setup lang="ts">
import { Heart, MessageSquare } from 'lucide-vue-next'

import Avatar from '@/components/common/Avatar.vue'
import { formatRelativeTime } from '@/utils/format-time'
import type { DiscussionPost } from '@/services/discussion/discussion.types'

defineProps<{ post: DiscussionPost }>()
</script>

<template>
  <div class="card">
    <div class="top">
      <Avatar :name="post.authorSnapshot.displayName" :size="26" />
      <span class="author">{{ post.authorSnapshot.displayName }}</span>
      <span class="time">· {{ formatRelativeTime(post.createdAt) }}</span>
      <span v-if="post.featured" class="featured-tag">精選</span>
    </div>
    <p class="title">{{ post.title }}</p>
    <p class="excerpt">{{ post.body.slice(0, 60) }}</p>
    <div class="foot">
      <span><Heart :size="14" /> {{ post.likeCount }}</span>
      <span><MessageSquare :size="14" /> {{ post.commentCount }}</span>
      <span class="category">{{ post.category }}</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  width: 100%;
}

.top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.time {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.featured-tag {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  padding: 2px 8px;
  border-radius: 999px;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.excerpt {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.foot {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: var(--color-text-disabled);
  font-weight: 600;
}

.foot span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.category {
  margin-left: auto;
  color: var(--color-text-secondary);
}
</style>
