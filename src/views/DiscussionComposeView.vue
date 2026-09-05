<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { DISCUSSION_CATEGORIES } from '@/services/discussion/discussion.types'
import { useAuthStore } from '@/stores/auth.store'
import { useDiscussionStore } from '@/stores/discussion.store'

const router = useRouter()
const authStore = useAuthStore()
const discussionStore = useDiscussionStore()

const category = ref(DISCUSSION_CATEGORIES[0])
const title = ref('')
const body = ref('')
const images = ref<File[]>([])
const previews = ref<string[]>([])
const submitting = ref(false)
const errorMessage = ref('')

const titleValid = computed(() => title.value.trim().length >= 2 && title.value.trim().length <= 80)
const bodyValid = computed(() => body.value.trim().length >= 1 && body.value.trim().length <= 5000)
const canSubmit = computed(() => titleValid.value && bodyValid.value && !submitting.value)

function handleImagePick(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const room = 4 - images.value.length
  const accepted = files.slice(0, room).filter((f) => f.type.startsWith('image/'))
  images.value.push(...accepted)
  previews.value.push(...accepted.map((f) => URL.createObjectURL(f)))
}

function removeImage(index: number): void {
  images.value.splice(index, 1)
  previews.value.splice(index, 1)
}

async function submit(): Promise<void> {
  if (!canSubmit.value || !authStore.user) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const postId = await discussionStore.createPost({
      authorId: authStore.user.id,
      authorSnapshot: { displayName: authStore.user.displayName ?? '匿名使用者' },
      title: title.value.trim(),
      body: body.value.trim(),
      category: category.value,
      images: images.value,
    })
    router.replace(`/discussion/${postId}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '文章發布失敗，請重試'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="發表新討論" back />

    <div class="content">
      <label class="field">
        <span>分類</span>
        <select v-model="category">
          <option v-for="c in DISCUSSION_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>

      <label class="field">
        <span>標題</span>
        <input v-model="title" placeholder="輸入討論標題" maxlength="80" />
      </label>

      <label class="field">
        <span>內容</span>
        <textarea v-model="body" placeholder="分享你的想法..." rows="8" maxlength="5000" />
      </label>

      <div class="field">
        <span>圖片（選填，最多 4 張）</span>
        <div class="image-row">
          <div v-for="(src, i) in previews" :key="src" class="preview">
            <img :src="src" alt="預覽圖片" />
            <button class="remove" @click="removeImage(i)"><X :size="12" /></button>
          </div>
          <label v-if="images.length < 4" class="add-image">
            +
            <input
              type="file"
              accept="image/*"
              multiple
              class="hidden-file"
              @change="handleImagePick"
            />
          </label>
        </div>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <PrimaryButton block :disabled="!canSubmit" @click="submit">
        {{ submitting ? '發布中...' : '發布討論' }}
      </PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.field input,
.field select,
.field textarea {
  border: 1px solid var(--color-border);
  border-radius: 11px;
  padding: 11px 13px;
  font-size: 13.5px;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.field textarea {
  resize: vertical;
}

.image-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preview {
  position: relative;
  width: 72px;
  height: 72px;
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-text-primary);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-image {
  width: 72px;
  height: 72px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--color-text-disabled);
}

.hidden-file {
  display: none;
}

.error {
  color: var(--color-danger);
  font-size: 13px;
  margin: 0;
}
</style>
