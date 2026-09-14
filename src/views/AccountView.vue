<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import Avatar from '@/components/common/Avatar.vue'
import PhotoLightbox from '@/components/common/PhotoLightbox.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { storageService } from '@/services/firebase/storage.service'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const displayName = ref(authStore.user?.displayName ?? '')
const saving = ref(false)
const saveMessage = ref('')
const saveIsError = ref(false)

// 大頭貼上傳 — pick → crop (1:1, PhotoLightbox's local-file mode) → compress
// small (avatars are always shown tiny, no need for MAX_LONG_EDGE's 1600px)
// → upload → point Auth + the Firestore mirror doc at the new URL → delete
// the previous file. Same shape as VehiclePhotoGallery.vue's own crop-
// confirm flow, just with a single fixed Storage path per user instead of a
// growing gallery array.
const avatarFileInput = ref<HTMLInputElement | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const avatarUploading = ref(false)
const avatarMessage = ref('')
const avatarIsError = ref(false)
const AVATAR_MAX_EDGE = 512

function pickAvatarFile(): void {
  avatarFileInput.value?.click()
}

function handleAvatarFileChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) pendingAvatarFile.value = file
  ;(event.target as HTMLInputElement).value = ''
}

async function handleAvatarCropConfirmed(blob: Blob): Promise<void> {
  const uid = authStore.user?.id
  if (!uid) return
  avatarUploading.value = true
  avatarMessage.value = ''
  const previousUrl = authStore.user?.photoUrl ?? null
  try {
    const { blob: compressed } = await imageCompressionService.compressImage(blob, {
      maxLongEdge: AVATAR_MAX_EDGE,
    })
    const url = await storageService.uploadAvatar(uid, compressed)
    await authStore.updateAvatarUrl(url)
    if (previousUrl) void storageService.deleteFileAtUrl(previousUrl)
    avatarIsError.value = false
    avatarMessage.value = '已更新大頭貼'
    pendingAvatarFile.value = null
  } catch {
    avatarIsError.value = true
    avatarMessage.value = '大頭貼上傳失敗，請稍後再試'
  } finally {
    avatarUploading.value = false
    setTimeout(() => {
      avatarMessage.value = ''
    }, 2500)
  }
}

const newEmail = ref(authStore.user?.email ?? '')
const currentPassword = ref('')
const savingEmail = ref(false)
const emailMessage = ref('')
const emailIsError = ref(false)

const sendingReset = ref(false)
const resetMessage = ref('')

const joinedDate = computed(() => {
  if (!authStore.user) return '—'
  return new Date(authStore.user.createdAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const canSave = computed(
  () =>
    !saving.value &&
    displayName.value.trim().length > 0 &&
    displayName.value.trim() !== (authStore.user?.displayName ?? ''),
)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const canSaveEmail = computed(
  () =>
    !savingEmail.value &&
    EMAIL_PATTERN.test(newEmail.value.trim()) &&
    newEmail.value.trim() !== (authStore.user?.email ?? '') &&
    currentPassword.value.length > 0,
)

async function handleSave(): Promise<void> {
  saving.value = true
  saveMessage.value = ''
  try {
    await authStore.updateDisplayName(displayName.value.trim())
    saveIsError.value = false
    saveMessage.value = '已更新顯示名稱'
  } catch {
    saveIsError.value = true
    saveMessage.value = '更新失敗，請稍後再試'
  } finally {
    saving.value = false
    setTimeout(() => {
      saveMessage.value = ''
    }, 2500)
  }
}

async function handleSaveEmail(): Promise<void> {
  savingEmail.value = true
  emailMessage.value = ''
  try {
    await authStore.updateEmail(newEmail.value.trim(), currentPassword.value)
    emailIsError.value = false
    emailMessage.value = `已寄出驗證信到 ${newEmail.value.trim()}，請至新信箱完成驗證後才會生效`
    currentPassword.value = ''
  } catch (error) {
    emailIsError.value = true
    const code = (error as { code?: string }).code
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      emailMessage.value = '目前密碼不正確'
    } else if (code === 'auth/email-already-in-use') {
      emailMessage.value = '此 Email 已被其他帳號使用'
    } else if (code === 'auth/invalid-email') {
      emailMessage.value = 'Email 格式不正確'
    } else {
      emailMessage.value = '更新失敗，請稍後再試'
    }
  } finally {
    savingEmail.value = false
  }
}

async function handleSendReset(): Promise<void> {
  if (!authStore.user?.email) return
  sendingReset.value = true
  resetMessage.value = ''
  try {
    await authStore.sendPasswordReset(authStore.user.email)
    resetMessage.value = `已寄出密碼重設信到 ${authStore.user.email}`
  } catch {
    resetMessage.value = '寄送失敗，請稍後再試'
  } finally {
    sendingReset.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="帳號" back />

    <div class="content">
      <div class="avatar-row">
        <button class="avatar-edit-btn" aria-label="更換大頭貼" @click="pickAvatarFile">
          <Avatar
            :name="displayName || authStore.user?.email || '?'"
            :photo-url="authStore.user?.photoUrl"
            :size="64"
          />
          <span class="avatar-edit-badge"><Camera :size="13" /></span>
        </button>
        <input
          ref="avatarFileInput"
          type="file"
          accept="image/*"
          hidden
          @change="handleAvatarFileChange"
        />
      </div>
      <p v-if="avatarMessage" class="feedback" :class="{ error: avatarIsError }">
        {{ avatarMessage }}
      </p>

      <PhotoLightbox
        v-if="pendingAvatarFile"
        :local-file="pendingAvatarFile"
        :aspect-ratio="1"
        :uploading="avatarUploading"
        @close="pendingAvatarFile = null"
        @crop-confirmed="handleAvatarCropConfirmed"
      />

      <label class="field">
        <span>顯示名稱</span>
        <input v-model="displayName" type="text" placeholder="輸入顯示名稱" maxlength="20" />
      </label>

      <PrimaryButton block :disabled="!canSave" @click="handleSave">
        {{ saving ? '儲存中...' : '儲存變更' }}
      </PrimaryButton>
      <p v-if="saveMessage" class="feedback" :class="{ error: saveIsError }">{{ saveMessage }}</p>

      <label class="field">
        <span>電子郵件</span>
        <input v-model="newEmail" type="email" placeholder="輸入新的電子郵件" />
      </label>
      <label class="field">
        <span>目前密碼（變更 Email 需要驗證身份）</span>
        <input v-model="currentPassword" type="password" placeholder="輸入目前密碼" />
      </label>

      <PrimaryButton block :disabled="!canSaveEmail" @click="handleSaveEmail">
        {{ savingEmail ? '更新中...' : '更新 Email' }}
      </PrimaryButton>
      <p v-if="emailMessage" class="feedback" :class="{ error: emailIsError }">
        {{ emailMessage }}
      </p>

      <div class="info-card">
        <div class="info-row">
          <span>使用者 ID</span>
          <span class="mono">{{ authStore.user?.id }}</span>
        </div>
        <div class="info-row">
          <span>加入日期</span>
          <span>{{ joinedDate }}</span>
        </div>
      </div>

      <button class="ghost-row" :disabled="sendingReset" @click="handleSendReset">
        {{ sendingReset ? '寄送中...' : '寄送密碼重設信' }}
      </button>
      <p v-if="resetMessage" class="feedback">{{ resetMessage }}</p>
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

.avatar-row {
  display: flex;
  justify-content: center;
  padding: var(--space-sm) 0;
}

.avatar-edit-btn {
  position: relative;
  border: none;
  background: none;
  padding: 0;
  border-radius: 999px;
}

.avatar-edit-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  border: 2px solid var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.field input {
  height: 48px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 400;
  color: var(--color-text-primary);
}

.feedback {
  margin: -4px 0 0;
  font-size: 12.5px;
  color: var(--color-success);
  text-align: center;
}

.feedback.error {
  color: var(--color-danger);
}

.info-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  font-size: 13.5px;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.info-row span:first-child {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.info-row span:last-child {
  color: var(--color-text-primary);
  font-weight: 600;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row .mono {
  font-family: monospace;
  font-size: 12px;
}

.ghost-row {
  height: 48px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 700;
}

.ghost-row:disabled {
  opacity: 0.6;
}
</style>
