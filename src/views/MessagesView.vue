<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MessageCircle, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConversationFilter from '@/components/chat/ConversationFilter.vue'
import type { ConversationFilterValue } from '@/components/chat/ConversationFilter.vue'
import ConversationRow from '@/components/chat/ConversationRow.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useChatStore } from '@/stores/chat.store'

const authStore = useAuthStore()
const chatStore = useChatStore()
const router = useRouter()

const filter = ref<ConversationFilterValue>('全部')
const searchOpen = ref(false)
const searchQuery = ref('')

const filtered = computed(() => {
  const uid = authStore.user?.id
  if (!uid) return []
  let list = chatStore.conversations.filter((c) => !c.archivedBy.includes(uid))
  if (filter.value === '未讀') list = list.filter((c) => (c.unreadCounts[uid] ?? 0) > 0)
  else if (filter.value === '交易中') list = list.filter((c) => c.tag === '交易中')
  else if (filter.value === '系統') list = list.filter((c) => c.tag === '系統')

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((c) => {
      const otherId = c.memberIds.find((id) => id !== uid)
      const name = (otherId && c.memberSnapshots[otherId]?.displayName) || ''
      return name.toLowerCase().includes(q)
    })
  }
  return list
})

function openConversation(id: string): void {
  router.push(`/messages/${id}`)
}

onMounted(() => {
  if (authStore.user) chatStore.subscribeConversations(authStore.user.id)
})

onUnmounted(() => {
  chatStore.stopConversationsSubscription()
})
</script>

<template>
  <div>
    <AppHeader title="訊息中心">
      <template #right>
        <button class="icon-button" aria-label="搜尋" @click="searchOpen = !searchOpen">
          <Search :size="18" />
        </button>
      </template>
    </AppHeader>

    <div class="content">
      <input
        v-if="searchOpen"
        v-model="searchQuery"
        class="search-input"
        placeholder="搜尋對話對象"
        autofocus
      />
      <ConversationFilter v-model="filter" />

      <p v-if="!chatStore.conversationsLoaded" class="loading">載入中...</p>
      <EmptyState
        v-else-if="filtered.length === 0"
        :icon="MessageCircle"
        title="目前沒有訊息"
        description="從交易市場聯絡賣家，開始你的第一則對話"
      >
        <template #action>
          <RouterLink to="/marketplace" class="link-btn">去市場看看</RouterLink>
        </template>
      </EmptyState>
      <div v-else class="list">
        <button v-for="c in filtered" :key="c.id" class="row-btn" @click="openConversation(c.id)">
          <ConversationRow :conversation="c" :current-uid="authStore.user!.id" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-button {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.search-input {
  height: 42px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 14px;
  background: var(--color-surface);
}

.loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--space-lg) 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-btn {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  width: 100%;
}

.link-btn {
  display: inline-flex;
  height: 40px;
  padding: 0 20px;
  align-items: center;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 700;
}
</style>
