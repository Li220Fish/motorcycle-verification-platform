<script setup lang="ts">
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore'
import { inject, onBeforeUnmount, ref } from 'vue'

import { db } from '@el/services/firebase'
import { STAFF_KEY } from './staff'

const staff = inject(STAFF_KEY)!
const members = ref<Array<DocumentData & { id: string }>>([])
const uid = ref('')
const name = ref('')
const message = ref('')

const off = onSnapshot(
  collection(db, 'engineLineStaff'),
  (snapshot) => (members.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
  (err) => (message.value = err.message),
)
onBeforeUnmount(off)

async function add(): Promise<void> {
  message.value = ''
  try {
    await setDoc(doc(db, 'engineLineStaff', uid.value.trim()), {
      name: name.value.trim() || '團隊成員',
      addedBy: staff.value?.uid ?? null,
      createdAt: serverTimestamp(),
    })
    uid.value = ''
    name.value = ''
  } catch {
    message.value = '只有管理員可以新增或移除成員。'
  }
}

async function remove(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'engineLineStaff', id))
  } catch {
    message.value = '只有管理員可以新增或移除成員。'
  }
}
</script>

<template>
  <div class="wrap">
    <div class="card">
      <h3>你的 UID</h3>
      <code>{{ staff?.uid }}</code>
      <p class="muted small">新成員先用自己的 Email 在 RiDE 測試機註冊，登入這個後台後會看到自己的 UID，再交給管理員加入。</p>
    </div>
    <div class="card">
      <h3>團隊成員</h3>
      <p v-if="!members.length" class="muted small">目前只有管理員。</p>
      <div v-for="m in members" :key="m.id" class="member">
        <div>
          <b>{{ m.name }}</b>
          <p class="muted small">{{ m.id }}</p>
        </div>
        <button class="link" @click="remove(m.id)">移除</button>
      </div>
      <form class="add" @submit.prevent="add">
        <input v-model="uid" placeholder="成員 UID" />
        <input v-model="name" placeholder="顯示名稱（會出現在 LINE 回覆）" />
        <button class="btn small" :disabled="!uid.trim()">加入成員</button>
      </form>
      <p v-if="message" class="error">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.wrap { max-width: 560px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
h3 { margin: 0 0 8px; font-size: 16px; }
code { word-break: break-all; background: var(--bg); padding: 6px 8px; border-radius: 6px; display: inline-block; }
.member { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
.member p { margin: 2px 0 0; }
.add { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.add input { font: inherit; font-size: 15px; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); }
</style>
