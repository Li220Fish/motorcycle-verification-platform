<script setup lang="ts">
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { ref } from 'vue'

import { auth } from '@/services/firebase/firebase'
import HomeScreen from './components/HomeScreen.vue'
import LoginScreen from './components/LoginScreen.vue'
import SessionScreen from './components/SessionScreen.vue'
import { uploadQueue } from './services/upload-queue'

const user = ref<User | null>(null)
const ready = ref(false)
const sessionId = ref<string | null>(null)
/** True when the session was just created — open the camera straight away. */
const freshSession = ref(false)
function openSession(id: string, fresh: boolean): void {
  freshSession.value = fresh
  sessionId.value = id
}

onAuthStateChanged(auth, (u) => {
  user.value = u
  ready.value = true
  sessionId.value = null
  if (u) void uploadQueue.resume(u.uid)
})

function handleSignOut(): void {
  if (
    uploadQueue.activeCount.value &&
    !confirm('還有照片尚未上傳，登出後會在下次登入時繼續上傳。確定登出？')
  ) {
    return
  }
  void signOut(auth)
}

window.addEventListener('beforeunload', (event) => {
  if (uploadQueue.activeCount.value) event.preventDefault()
})
</script>

<template>
  <div v-if="!ready" class="page muted center">載入中…</div>
  <LoginScreen v-else-if="!user" />
  <template v-else>
    <SessionScreen
      v-if="sessionId"
      :key="sessionId"
      :session-id="sessionId"
      :uid="user.uid"
      :auto-start="freshSession"
      @back="sessionId = null"
    />
    <HomeScreen
      v-else
      :uid="user.uid"
      :email="user.email ?? ''"
      @open-session="openSession"
      @sign-out="handleSignOut"
    />

    <button
      v-if="uploadQueue.activeCount.value"
      class="queue-bar"
      :class="{ bad: uploadQueue.errorCount.value }"
      @click="uploadQueue.retryFailed()"
    >
      <template v-if="uploadQueue.errorCount.value">
        {{ uploadQueue.errorCount.value }} 張上傳失敗 · 點此重試
      </template>
      <template v-else>上傳中，剩 {{ uploadQueue.activeCount.value }} 張</template>
    </button>
  </template>
</template>

<style scoped>
.queue-bar {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 6px);
  right: 12px;
  z-index: 40;
  border: 0;
  border-radius: 999px;
  padding: 5px 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  background: var(--action);
  color: #fff;
}

.queue-bar.bad {
  background: var(--bad);
}
</style>
