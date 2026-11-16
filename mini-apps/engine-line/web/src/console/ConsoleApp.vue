<script setup lang="ts">
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore'
import { onBeforeUnmount, provide, ref } from 'vue'

import { auth, db } from '@el/services/firebase'
import ChecksPanel from './ChecksPanel.vue'
import SimulatorPanel from './SimulatorPanel.vue'
import StaffPanel from './StaffPanel.vue'
import TicketsPanel from './TicketsPanel.vue'
import { STAFF_KEY, type StaffIdentity } from './staff'

type Tab = 'tickets' | 'checks' | 'simulator' | 'staff'

const user = ref<User | null>(null)
const ready = ref(false)
const allowed = ref(false)
const staff = ref<StaffIdentity | null>(null)
const tab = ref<Tab>('tickets')
const focusCheckId = ref<string | null>(null)
const email = ref('')
const password = ref('')
const loginError = ref('')

provide(STAFF_KEY, staff)

const off = onAuthStateChanged(auth, async (current) => {
  user.value = current && !current.isAnonymous ? current : null
  allowed.value = false
  staff.value = null
  if (user.value) {
    try {
      // Rules decide who is staff; a read probe is the source of truth.
      await getDocs(query(collection(db, 'engineLineTickets'), limit(1)))
      const self = await getDoc(doc(db, 'engineLineStaff', user.value.uid))
      staff.value = {
        uid: user.value.uid,
        name: (self.data()?.name as string) || user.value.email || '團隊成員',
      }
      allowed.value = true
    } catch {
      allowed.value = false
    }
  }
  ready.value = true
})
onBeforeUnmount(off)

async function login(): Promise<void> {
  loginError.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
  } catch {
    loginError.value = '登入失敗，請確認帳號密碼。'
  }
}

function openCheck(checkId: string): void {
  focusCheckId.value = checkId
  tab.value = 'checks'
}
</script>

<template>
  <div class="console">
    <header class="bar">
      <b>🏍️ 引擎檢測・客服後台</b>
      <nav v-if="allowed" class="tabs">
        <button :class="{ on: tab === 'tickets' }" @click="tab = 'tickets'">對話</button>
        <button :class="{ on: tab === 'checks' }" @click="tab = 'checks'">檢測紀錄</button>
        <button :class="{ on: tab === 'simulator' }" @click="tab = 'simulator'">LINE 模擬器</button>
        <button :class="{ on: tab === 'staff' }" @click="tab = 'staff'">成員</button>
      </nav>
      <span v-if="user" class="who">
        {{ staff?.name ?? user.email }}
        <button class="link" @click="signOut(auth)">登出</button>
      </span>
    </header>

    <p v-if="!ready" class="pad muted">載入中…</p>

    <form v-else-if="!user" class="login card" @submit.prevent="login">
      <h2>團隊成員登入</h2>
      <input v-model="email" type="email" placeholder="Email" autocomplete="username" />
      <input v-model="password" type="password" placeholder="密碼" autocomplete="current-password" />
      <p v-if="loginError" class="error">{{ loginError }}</p>
      <button class="btn" type="submit">登入</button>
    </form>

    <div v-else-if="!allowed" class="pad card">
      <h2>還沒有後台權限</h2>
      <p>請管理員在「成員」頁加入你的 UID：</p>
      <code>{{ user.uid }}</code>
    </div>

    <template v-else>
      <TicketsPanel v-if="tab === 'tickets'" @open-check="openCheck" />
      <ChecksPanel v-else-if="tab === 'checks'" :focus-id="focusCheckId" />
      <SimulatorPanel v-else-if="tab === 'simulator'" />
      <StaffPanel v-else />
    </template>
  </div>
</template>

<style scoped>
.console { min-height: 100vh; display: flex; flex-direction: column; }
.bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line); background: var(--surface); position: sticky; top: 0; z-index: 2; }
.tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.tabs button { border: 0; background: none; padding: 8px 12px; border-radius: 8px; font: inherit; color: var(--muted); cursor: pointer; }
.tabs button.on { background: var(--accent-soft); color: var(--accent-ink); font-weight: 700; }
.who { margin-left: auto; font-size: 13px; color: var(--muted); display: flex; gap: 8px; align-items: center; }
.login { max-width: 360px; margin: 48px auto; display: flex; flex-direction: column; gap: 10px; width: calc(100% - 32px); }
.login input { font: inherit; font-size: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); }
.pad { margin: 24px 16px; }
code { word-break: break-all; background: var(--bg); padding: 6px 8px; border-radius: 6px; display: inline-block; }
</style>
