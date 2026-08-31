<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { MessageSquare, Plus, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DiscussionFilter from '@/components/discussion/DiscussionFilter.vue'
import DiscussionPostCard from '@/components/discussion/DiscussionPostCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDiscussionStore } from '@/stores/discussion.store'
import type { DiscussionSort } from '@/services/discussion/discussion.types'

const authStore = useAuthStore()
const discussionStore = useDiscussionStore()
const router = useRouter()

const searchOpen = ref(false)
const searchQuery = ref('')

async function handleSortChange(sort: DiscussionSort): Promise<void> {
  await discussionStore.subscribeToSort(sort, authStore.user?.id)
}

onMounted(async () => {
  await discussionStore.subscribeToSort('hot', authStore.user?.id)
})

onUnmounted(() => {
  discussionStore.stopPostsSubscription()
})
</script>

<template>
  <div class="discussion-shell">
    <AppHeader title="討論中心">
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
        placeholder="搜尋討論標題"
        autofocus
      />
      <DiscussionFilter
        :model-value="discussionStore.sort"
        @update:model-value="handleSortChange"
      />

      <p v-if="!discussionStore.postsLoaded" class="loading">載入中...</p>
      <EmptyState
        v-else-if="discussionStore.posts.length === 0"
        :icon="MessageSquare"
        :title="discussionStore.sort === 'following' ? '尚未追蹤任何人' : '目前還沒有討論'"
        :description="
          discussionStore.sort === 'following'
            ? '追蹤其他使用者，看看他們在聊什麼'
            : '發表第一篇討論，開始交流'
        "
      >
        <template #action>
          <button class="link-btn" @click="router.push('/discussion/compose')">發表第一篇</button>
        </template>
      </EmptyState>
      <div v-else class="list">
        <button
          v-for="post in discussionStore.posts.filter(
            (p) =>
              !searchQuery.trim() ||
              p.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          )"
          :key="post.id"
          class="post-btn"
          @click="router.push(`/discussion/${post.id}`)"
        >
          <DiscussionPostCard :post="post" />
        </button>
      </div>
    </div>

    <button class="fab" aria-label="發表新討論" @click="router.push('/discussion/compose')">
      <Plus :size="22" color="#fff" />
    </button>
  </div>
</template>

<style scoped>
.discussion-shell {
  position: relative;
  min-height: 100vh;
}

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
  padding-bottom: calc(var(--bottom-nav-height) + 60px);
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
  gap: 10px;
}

.post-btn {
  background: none;
  border: none;
  padding: 0;
  width: 100%;
}

.link-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: 13.5px;
  font-weight: 700;
}

.fab {
  position: fixed;
  right: 18px;
  bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--color-primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px -6px rgba(23, 105, 232, 0.55);
  z-index: 15;
}
</style>
