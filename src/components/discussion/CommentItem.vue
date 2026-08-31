<script setup lang="ts">
import Avatar from '@/components/common/Avatar.vue'
import { formatRelativeTime } from '@/utils/format-time'
import type { DiscussionComment } from '@/services/discussion/discussion.types'

defineProps<{ comment: DiscussionComment; canDelete: boolean }>()
defineEmits<{ delete: [] }>()
</script>

<template>
  <div class="row">
    <Avatar :name="comment.authorSnapshot.displayName" :size="28" />
    <div class="bubble">
      <div class="author-row">
        <span class="author">{{ comment.authorSnapshot.displayName }}</span>
        <span class="time">{{ formatRelativeTime(comment.createdAt) }}</span>
      </div>
      <p v-if="comment.status === 'deleted'" class="deleted">此留言已刪除</p>
      <p v-else class="text">{{ comment.text }}</p>
      <button
        v-if="canDelete && comment.status !== 'deleted'"
        class="delete-btn"
        @click="$emit('delete')"
      >
        刪除
      </button>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 10px;
}

.bubble {
  flex: 1;
  background: var(--color-background);
  border-radius: 12px;
  padding: 9px 12px;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.time {
  font-size: 10.5px;
  color: var(--color-text-disabled);
}

.text {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.deleted {
  margin: 2px 0 0;
  font-size: 12px;
  font-style: italic;
  color: var(--color-text-disabled);
}

.delete-btn {
  margin-top: 4px;
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  color: var(--color-danger);
  font-weight: 700;
}
</style>
