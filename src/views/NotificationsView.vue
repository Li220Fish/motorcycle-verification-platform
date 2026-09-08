<script setup lang="ts">
import { computed } from 'vue'
import {
  Bell,
  Calendar,
  Heart,
  Megaphone,
  MessageCircle,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useNotificationStore } from '@/stores/notification.store'
import { formatRelativeTime } from '@/utils/format-time'
import type { AppNotification, NotificationType } from '@/types/notification'

const router = useRouter()
const notificationStore = useNotificationStore()

const ICONS: Record<NotificationType, LucideIcon> = {
  chat_message: MessageCircle,
  listing_favorited: Heart,
  booking_request: Calendar,
  system: Megaphone,
  vehicle_news: Newspaper,
  discussion_featured: Sparkles,
  discussion_admin_post: Megaphone,
  discussion_comment: MessageCircle,
  discussion_like: Heart,
  discussion_reply: MessageCircle,
}

const sorted = computed(() => [...notificationStore.notifications].sort((a, b) => b.createdAt - a.createdAt))

async function handleOpen(notification: AppNotification): Promise<void> {
  if (!notification.read) await notificationStore.markAsRead(notification.id)
  if (notification.link) router.push(notification.link)
}

async function handleMarkAllRead(): Promise<void> {
  await notificationStore.markAllAsRead()
}
</script>

<template>
  <div>
    <AppHeader title="通知" back>
      <template #right>
        <button
          v-if="notificationStore.unreadCount > 0"
          class="mark-all-btn"
          @click="handleMarkAllRead"
        >
          全部標為已讀
        </button>
      </template>
    </AppHeader>

    <div class="content">
      <p v-if="!notificationStore.loaded" class="state-text">載入中...</p>
      <EmptyState
        v-else-if="sorted.length === 0"
        :icon="Bell"
        title="還沒有通知"
        description="有新的訊息、收藏、留言或系統公告時，會顯示在這裡。"
      />
      <div v-else class="list">
        <button
          v-for="n in sorted"
          :key="n.id"
          class="row"
          :class="{ unread: !n.read }"
          @click="handleOpen(n)"
        >
          <div class="icon-wrap">
            <component :is="ICONS[n.type]" :size="18" color="var(--color-primary)" />
          </div>
          <div class="info">
            <p class="title">{{ n.title }}</p>
            <p class="body">{{ n.body }}</p>
            <p class="time">{{ formatRelativeTime(n.createdAt) }}</p>
          </div>
          <span v-if="!n.read" class="dot" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mark-all-btn {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12.5px;
  font-weight: 700;
  padding: 0;
}

.content {
  padding: var(--space-md);
}

.state-text {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  padding: var(--space-lg) 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.row {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: left;
}

.row.unread {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.icon-wrap {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.body {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.time {
  font-size: 11px;
  color: var(--color-text-disabled);
  margin: 4px 0 0;
}

.dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
</style>
