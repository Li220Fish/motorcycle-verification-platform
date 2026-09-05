<script setup lang="ts">
import Avatar from '@/components/common/Avatar.vue'
import { formatRelativeTime } from '@/utils/format-time'
import type { Conversation } from '@/services/chat/chat.types'

const props = defineProps<{ conversation: Conversation; currentUid: string }>()

function otherName(): string {
  const otherId = props.conversation.memberIds.find((id) => id !== props.currentUid)
  if (!otherId) return '未知使用者'
  return props.conversation.memberSnapshots[otherId]?.displayName ?? '未知使用者'
}
</script>

<template>
  <div class="row">
    <Avatar :name="otherName()" :size="42" />
    <div class="body">
      <div class="top">
        <span class="name">{{ otherName() }}</span>
        <span class="tag">{{ conversation.tag }}</span>
      </div>
      <p class="preview">{{ conversation.lastMessage?.text ?? '尚無訊息' }}</p>
    </div>
    <div class="right">
      <span class="time">{{ formatRelativeTime(conversation.lastMessageAt) }}</span>
      <span v-if="(conversation.unreadCounts[currentUid] ?? 0) > 0" class="unread-dot">
        {{ Math.min(conversation.unreadCounts[currentUid], 99)
        }}{{ conversation.unreadCounts[currentUid] > 99 ? '+' : '' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1.5px 7px;
  border-radius: 999px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  flex-shrink: 0;
}

.preview {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.time {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.unread-dot {
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-danger);
  color: #fff;
  font-size: 10.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
