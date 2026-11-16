<script setup lang="ts">
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { db, storage } from '@el/services/firebase'
import { CATEGORY_LABEL, formatTime, STAFF_KEY, STATUS_LABEL, TICKET_LABELS } from './staff'

const emit = defineEmits<{ 'open-check': [string] }>()
const staff = inject(STAFF_KEY)!

interface Ticket extends DocumentData {
  id: string
}
interface Message extends DocumentData {
  id: string
}

const tickets = ref<Ticket[]>([])
const filter = ref<'active' | 'all' | 'resolved'>('active')
const selectedId = ref<string | null>(null)
const messages = ref<Message[]>([])
const replyText = ref('')
const sending = ref(false)
const note = ref('')
const mediaUrls = ref<Record<string, string>>({})
const thread = ref<HTMLElement | null>(null)
const error = ref('')

let offMessages: Unsubscribe | null = null
const offTickets = onSnapshot(
  query(collection(db, 'engineLineTickets'), orderBy('lastMessageAt', 'desc'), limit(200)),
  (snapshot) => (tickets.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
  (err) => (error.value = err.message),
)
onBeforeUnmount(() => {
  offTickets()
  offMessages?.()
})

const visible = computed(() =>
  tickets.value.filter((t) =>
    filter.value === 'all' ? true : filter.value === 'resolved' ? t.status === 'resolved' : t.status !== 'resolved',
  ),
)
const selected = computed(() => tickets.value.find((t) => t.id === selectedId.value) ?? null)

watch(selectedId, (id) => {
  offMessages?.()
  messages.value = []
  mediaUrls.value = {}
  if (!id) return
  note.value = (tickets.value.find((t) => t.id === id)?.staffNote as string) ?? ''
  offMessages = onSnapshot(
    query(collection(db, 'engineLineTickets', id, 'messages'), orderBy('createdAt', 'asc'), limit(500)),
    async (snapshot) => {
      messages.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      await nextTick()
      thread.value?.scrollTo({ top: thread.value.scrollHeight })
    },
  )
  const ticket = tickets.value.find((t) => t.id === id)
  if (ticket && ticket.unreadForStaff) void patch({ unreadForStaff: 0 })
})

async function patch(fields: Record<string, unknown>): Promise<void> {
  if (!selectedId.value) return
  try {
    await updateDoc(doc(db, 'engineLineTickets', selectedId.value), { ...fields, updatedAt: serverTimestamp() })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

async function send(): Promise<void> {
  const text = replyText.value.trim()
  if (!text || !selectedId.value || !staff.value) return
  sending.value = true
  try {
    await addDoc(collection(db, 'engineLineTickets', selectedId.value, 'messages'), {
      from: 'staff',
      type: 'text',
      text,
      staffUid: staff.value.uid,
      staffName: staff.value.name,
      delivery: 'pending',
      createdAt: serverTimestamp(),
    })
    replyText.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    sending.value = false
  }
}

function toggleLabel(label: string): void {
  const labels = new Set<string>((selected.value?.labels as string[]) ?? [])
  if (labels.has(label)) labels.delete(label)
  else labels.add(label)
  void patch({ labels: [...labels] })
}

async function loadMedia(message: Message): Promise<void> {
  if (!message.mediaPath) return
  try {
    mediaUrls.value = { ...mediaUrls.value, [message.id]: await getDownloadURL(storageRef(storage, message.mediaPath)) }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

const DELIVERY: Record<string, string> = {
  pending: '傳送中…',
  sent: '已送達 LINE',
  failed: '⚠️ 傳送失敗',
  simulated: '（模擬／未連 LINE，未實際傳送）',
}
</script>

<template>
  <div class="layout">
    <aside class="list" :class="{ hidden: selectedId }">
      <div class="filters">
        <button :class="{ on: filter === 'active' }" @click="filter = 'active'">進行中</button>
        <button :class="{ on: filter === 'resolved' }" @click="filter = 'resolved'">已結案</button>
        <button :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
      </div>
      <p v-if="error" class="error pad">{{ error }}</p>
      <p v-if="!visible.length" class="muted pad">目前沒有對話。</p>
      <button
        v-for="t in visible"
        :key="t.id"
        class="ticket"
        :class="{ on: t.id === selectedId }"
        @click="selectedId = t.id"
      >
        <div class="row-between">
          <b>{{ t.userName || t.lineUserId?.slice(0, 10) }}</b>
          <span class="muted small">{{ formatTime(t.lastMessageAt) }}</span>
        </div>
        <div class="row-between">
          <span class="muted small ellipsis">{{ t.lastMessagePreview }}</span>
          <span v-if="t.unreadForStaff" class="badge">{{ t.unreadForStaff }}</span>
        </div>
        <div class="chips">
          <span class="chip" :class="t.status">{{ STATUS_LABEL[t.status] }}</span>
          <span class="chip">{{ CATEGORY_LABEL[t.category] ?? t.category }}</span>
          <span v-if="t.lineUserId?.startsWith('sim-')" class="chip">模擬</span>
        </div>
      </button>
    </aside>

    <section v-if="selected" class="detail">
      <div class="detail-head">
        <button class="link mobile-only" @click="selectedId = null">← 返回</button>
        <b>{{ selected.userName || selected.lineUserId }}</b>
        <select :value="selected.status" @change="patch({ status: ($event.target as HTMLSelectElement).value })">
          <option value="open">待處理</option>
          <option value="in_progress">處理中</option>
          <option value="resolved">已結案</option>
        </select>
        <button
          v-if="selected.assigneeUid !== staff?.uid"
          class="btn small secondary"
          @click="patch({ assigneeUid: staff?.uid, assigneeName: staff?.name })"
        >
          指派給我
        </button>
        <span v-else class="muted small">負責：我</span>
        <button v-if="selected.checkId" class="btn small secondary" @click="emit('open-check', selected.checkId)">看檢測</button>
      </div>

      <div class="chips labels">
        <button
          v-for="label in TICKET_LABELS"
          :key="label"
          class="chip toggle"
          :class="{ on: (selected.labels ?? []).includes(label) }"
          @click="toggleLabel(label)"
        >
          {{ label }}
        </button>
      </div>

      <div ref="thread" class="thread">
        <div v-for="m in messages" :key="m.id" class="msg" :class="m.from">
          <div class="bubble">
            <p v-if="m.from === 'staff'" class="meta">{{ m.staffName }}</p>
            <template v-if="m.type === 'text' || m.type === 'check'">
              <p class="text">{{ m.text }}</p>
              <button v-if="m.checkId" class="link small" @click="emit('open-check', m.checkId)">查看檢測 →</button>
            </template>
            <template v-else>
              <p class="text">{{ { image: '📷 照片', audio: '🎙️ 錄音', video: '🎬 影片', file: '📎 檔案' }[m.type as string] }} {{ m.text ?? '' }}</p>
              <template v-if="mediaUrls[m.id]">
                <img v-if="m.type === 'image'" :src="mediaUrls[m.id]" class="media" alt="" />
                <audio v-else-if="m.type === 'audio'" :src="mediaUrls[m.id]" controls />
                <video v-else-if="m.type === 'video'" :src="mediaUrls[m.id]" controls class="media" />
                <a v-else :href="mediaUrls[m.id]" target="_blank" rel="noopener">下載</a>
              </template>
              <button v-else-if="m.mediaPath" class="link small" @click="loadMedia(m)">載入</button>
              <p v-else class="muted small">（檔案未取得：LINE 尚未設定）</p>
            </template>
            <p class="meta">
              {{ formatTime(m.createdAt) }}
              <span v-if="m.from === 'staff'">・{{ DELIVERY[m.delivery] ?? m.delivery }}</span>
            </p>
          </div>
        </div>
      </div>

      <form class="reply" @submit.prevent="send">
        <textarea
          v-model="replyText"
          rows="2"
          placeholder="回覆使用者（會從 LINE 官方帳號送出）"
          @keydown.enter.exact.prevent="send"
        />
        <button class="btn" :disabled="sending || !replyText.trim()">送出</button>
      </form>
      <details class="note">
        <summary>內部備註</summary>
        <textarea v-model="note" rows="3" placeholder="只有團隊看得到" />
        <button class="btn small secondary" @click="patch({ staffNote: note })">儲存備註</button>
      </details>
    </section>
    <section v-else class="detail empty muted">選擇左邊的對話</section>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 320px 1fr; flex: 1; min-height: 0; height: calc(100vh - 54px); }
.list { border-right: 1px solid var(--line); overflow-y: auto; }
.filters { display: flex; gap: 4px; padding: 10px; position: sticky; top: 0; background: var(--bg); }
.filters button { flex: 1; border: 1px solid var(--line); background: var(--surface); padding: 6px; border-radius: 8px; font: inherit; font-size: 13px; color: var(--ink); cursor: pointer; }
.filters button.on { background: var(--accent); color: #fff; border-color: var(--accent); }
.ticket { display: flex; flex-direction: column; gap: 4px; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: none; padding: 10px 12px; font: inherit; color: var(--ink); cursor: pointer; }
.ticket.on { background: var(--accent-soft); }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
.badge { background: var(--bad); color: #fff; border-radius: 999px; font-size: 12px; padding: 0 7px; }
.chips { display: flex; gap: 4px; flex-wrap: wrap; }
.chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--bg); border: 1px solid var(--line); color: var(--muted); }
.chip.open { color: var(--bad); border-color: var(--bad); }
.chip.in_progress { color: var(--warn); border-color: var(--warn); }
.chip.toggle { cursor: pointer; font: inherit; font-size: 12px; }
.chip.toggle.on { background: var(--accent); color: #fff; border-color: var(--accent); }
.detail { display: flex; flex-direction: column; min-height: 0; }
.detail.empty { align-items: center; justify-content: center; }
.detail-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 10px 12px; border-bottom: 1px solid var(--line); }
.detail-head select { font: inherit; padding: 4px 6px; border-radius: 6px; }
.labels { padding: 8px 12px; border-bottom: 1px solid var(--line); }
.thread { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: var(--bg); }
.msg { display: flex; }
.msg.staff { justify-content: flex-end; }
.msg.system, .msg.bot { justify-content: center; }
.bubble { max-width: 75%; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 8px 12px; }
.msg.staff .bubble { background: var(--accent-soft); border-color: transparent; }
.msg.system .bubble { background: transparent; border-style: dashed; font-size: 13px; color: var(--muted); }
.text { white-space: pre-wrap; margin: 0; word-break: break-word; }
.meta { font-size: 11px; color: var(--muted); margin: 4px 0 0; }
.media { max-width: 100%; border-radius: 8px; margin-top: 6px; }
.reply { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--line); }
.reply textarea, .note textarea { flex: 1; font: inherit; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); width: 100%; box-sizing: border-box; }
.reply .btn { width: auto; padding: 0 18px; }
.note { padding: 0 12px 12px; }
.note summary { cursor: pointer; color: var(--muted); font-size: 13px; padding: 6px 0; }
.pad { padding: 12px; }
.mobile-only { display: none; }
@media (max-width: 760px) {
  .layout { grid-template-columns: 1fr; }
  .list.hidden { display: none; }
  .detail.empty { display: none; }
  .mobile-only { display: inline; }
}
</style>
