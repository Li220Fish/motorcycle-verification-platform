import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Unsubscribe } from 'firebase/firestore'

import { notificationService } from '@/services/firebase/notification.service'
import type { AppNotification } from '@/types/notification'

export const useNotificationStore = defineStore('notification', () => {
  const currentUid = ref<string | null>(null)
  const notifications = ref<AppNotification[]>([])
  const loaded = ref(false)

  let unsubNotifications: Unsubscribe | null = null

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  /** Call once per session (e.g. from AppLayout, alongside chat's own
   *  subscribeConversations) — idempotent per uid. */
  function subscribe(uid: string): void {
    if (unsubNotifications && currentUid.value === uid) return
    unsubNotifications?.()
    currentUid.value = uid
    loaded.value = false
    unsubNotifications = notificationService.subscribeNotifications(uid, (list) => {
      notifications.value = list
      loaded.value = true
    })
  }

  function stopSubscription(): void {
    unsubNotifications?.()
    unsubNotifications = null
    notifications.value = []
    loaded.value = false
  }

  async function markAsRead(notificationId: string): Promise<void> {
    if (!currentUid.value) return
    await notificationService.markAsRead(currentUid.value, notificationId)
  }

  async function markAllAsRead(): Promise<void> {
    if (!currentUid.value) return
    const unreadIds = notifications.value.filter((n) => !n.read).map((n) => n.id)
    await notificationService.markAllAsRead(currentUid.value, unreadIds)
  }

  return {
    notifications,
    loaded,
    unreadCount,
    subscribe,
    stopSubscription,
    markAsRead,
    markAllAsRead,
  }
})
