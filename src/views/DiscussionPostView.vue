<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Flag, Heart, MessageSquare, MoreVertical, Trash2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import Avatar from '@/components/common/Avatar.vue'
import AuthorFollowButton from '@/components/discussion/AuthorFollowButton.vue'
import CommentInput from '@/components/discussion/CommentInput.vue'
import CommentItem from '@/components/discussion/CommentItem.vue'
import { commentService } from '@/services/discussion/comment.service'
import { discussionService } from '@/services/discussion/discussion.service'
import { useAuthStore } from '@/stores/auth.store'
import { useDiscussionStore } from '@/stores/discussion.store'
import { formatRelativeTime } from '@/utils/format-time'

const props = defineProps<{ postId: string }>()

const router = useRouter()
const authStore = useAuthStore()
const discussionStore = useDiscussionStore()

const liked = ref(false)
const sendingComment = ref(false)
const menuOpen = ref(false)
const actionMessage = ref('')

const isAuthor = computed(
  () => !!authStore.user && discussionStore.currentPost?.authorId === authStore.user.id,
)

async function loadLikeState(): Promise<void> {
  if (!authStore.user) return
  liked.value = await discussionService.isLiked(props.postId, authStore.user.id)
}

async function toggleLike(): Promise<void> {
  if (!authStore.user) return
  liked.value = await discussionStore.toggleLike(props.postId, authStore.user.id)
}

async function submitComment(text: string): Promise<void> {
  if (!authStore.user) return
  sendingComment.value = true
  try {
    await discussionStore.addComment(
      props.postId,
      authStore.user.id,
      { displayName: authStore.user.displayName ?? '匿名使用者' },
      text,
    )
  } finally {
    sendingComment.value = false
  }
}

async function deleteComment(commentId: string): Promise<void> {
  await commentService.deleteComment(props.postId, commentId)
}

async function deletePost(): Promise<void> {
  menuOpen.value = false
  await discussionService.softDeletePost(props.postId)
  router.push('/discussion')
}

async function reportPost(): Promise<void> {
  menuOpen.value = false
  if (!authStore.user) return
  await discussionService.reportContent(authStore.user.id, 'post', props.postId, '不當言論')
  actionMessage.value = '已送出檢舉，我們會儘快處理'
}

onMounted(() => {
  discussionStore.openPost(props.postId)
  loadLikeState()
})

onUnmounted(() => {
  discussionStore.closePost()
})
</script>

<template>
  <div>
    <AppHeader title="討論內容" back>
      <template #right>
        <button class="icon-button" aria-label="更多" @click="menuOpen = !menuOpen">
          <MoreVertical :size="18" />
        </button>
      </template>
    </AppHeader>

    <div v-if="menuOpen" class="menu">
      <button v-if="isAuthor" class="danger" @click="deletePost">
        <Trash2 :size="15" />刪除文章
      </button>
      <button v-else @click="reportPost"><Flag :size="15" />檢舉文章</button>
    </div>

    <div v-if="!discussionStore.currentPost" class="loading">載入中...</div>
    <div v-else-if="discussionStore.currentPost.status === 'deleted'" class="loading">
      此文章已刪除
    </div>

    <div v-else class="scroll">
      <div class="post-card">
        <div class="top">
          <Avatar :name="discussionStore.currentPost.authorSnapshot.displayName" :size="32" />
          <div class="author-col">
            <span class="author">{{ discussionStore.currentPost.authorSnapshot.displayName }}</span>
            <span class="time">{{
              formatRelativeTime(discussionStore.currentPost.createdAt)
            }}</span>
          </div>
          <AuthorFollowButton
            v-if="authStore.user"
            :current-uid="authStore.user.id"
            :target-uid="discussionStore.currentPost.authorId"
          />
        </div>
        <p class="title">{{ discussionStore.currentPost.title }}</p>
        <p class="body">{{ discussionStore.currentPost.body }}</p>
        <div v-if="discussionStore.currentPost.media.length" class="media-grid">
          <img
            v-for="m in discussionStore.currentPost.media"
            :key="m.storagePath"
            :src="m.url"
            alt="討論圖片"
          />
        </div>
        <div class="foot">
          <button class="like-btn" :class="{ liked }" @click="toggleLike">
            <Heart :size="16" :fill="liked ? 'currentColor' : 'none'" />
            {{ discussionStore.currentPost.likeCount }}
          </button>
          <span
            ><MessageSquare :size="15" />
            {{ discussionStore.comments.filter((c) => c.status !== 'deleted').length }} 則留言</span
          >
        </div>
      </div>

      <p v-if="actionMessage" class="action-message">{{ actionMessage }}</p>

      <div class="comments">
        <p v-if="!discussionStore.commentsLoaded" class="loading small">載入留言中...</p>
        <p v-else-if="discussionStore.comments.length === 0" class="loading small">
          還沒有留言，搶頭香吧！
        </p>
        <CommentItem
          v-for="c in discussionStore.comments"
          :key="c.id"
          :comment="c"
          :can-delete="c.authorId === authStore.user?.id"
          @delete="deleteComment(c.id)"
        />
      </div>
    </div>

    <CommentInput
      v-if="discussionStore.currentPost"
      :sending="sendingComment"
      @submit="submitComment"
    />
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

.menu {
  position: absolute;
  right: var(--space-md);
  top: 52px;
  z-index: 30;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.menu button.danger {
  color: var(--color-danger);
}

.loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--space-lg) 0;
}

.loading.small {
  padding: var(--space-md) 0;
  font-size: 12.5px;
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
  gap: 10px;
}

.author-col {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.author {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-primary);
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

.media-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.media-grid img {
  width: 100%;
  border-radius: var(--radius-md);
}

.foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}

.foot span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.like-btn.liked {
  color: var(--color-danger);
}

.action-message {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-success);
  text-align: center;
}

.comments {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
