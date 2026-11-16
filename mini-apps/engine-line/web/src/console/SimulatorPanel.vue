<script setup lang="ts">
import { httpsCallable } from 'firebase/functions'
import { nextTick, ref } from 'vue'

import { functions } from '@el/services/firebase'

interface QuickReplyAction {
  type: 'message' | 'uri' | 'postback'
  label: string
  text?: string
  uri?: string
  data?: string
  displayText?: string
}
interface BotMessage {
  type: 'text'
  text: string
  quickReply?: { items: Array<{ action: QuickReplyAction }> }
}
interface SimResult {
  lineUserId: string
  sent: Array<{ kind: string; messages: BotMessage[] }>
}
interface Line {
  from: 'user' | 'bot'
  text: string
  actions?: QuickReplyAction[]
}

const simulate = httpsCallable<{ type?: string; text?: string; postback?: string }, SimResult>(
  functions,
  'simulateLineEvent',
)

const lines = ref<Line[]>([])
const input = ref('')
const busy = ref(false)
const error = ref('')
const userId = ref('')
const view = ref<HTMLElement | null>(null)

async function run(payload: { type?: string; text?: string; postback?: string }, shown: string): Promise<void> {
  busy.value = true
  error.value = ''
  lines.value.push({ from: 'user', text: shown })
  try {
    const { data } = await simulate(payload)
    userId.value = data.lineUserId
    for (const sent of data.sent) {
      for (const message of sent.messages) {
        lines.value.push({
          from: 'bot',
          text: message.text,
          actions: message.quickReply?.items.map((item) => item.action),
        })
      }
    }
    if (!data.sent.length) lines.value.push({ from: 'bot', text: '（沒有自動回覆 — 訊息已轉進對話，等團隊成員回覆）' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
    await nextTick()
    view.value?.scrollTo({ top: view.value.scrollHeight })
  }
}

function sendText(): void {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  void run({ text }, text)
}

function tap(action: QuickReplyAction): void {
  if (action.type === 'uri' && action.uri) window.open(action.uri, '_blank', 'noopener')
  else if (action.type === 'message' && action.text) void run({ text: action.text }, action.text)
  else if (action.type === 'postback' && action.data) void run({ postback: action.data }, action.displayText ?? action.label)
}
</script>

<template>
  <div class="sim">
    <div class="card intro">
      <b>LINE 模擬器</b>
      <p class="muted small">
        用你的帳號扮演一位 LINE 使用者（{{ userId || 'sim-你的UID' }}），走過真實的 bot 流程：
        訊息會進到「對話」頁，你可以切過去用後台回覆（模擬使用者不會真的收到 LINE）。
      </p>
      <button class="btn small secondary" :disabled="busy" @click="run({ type: 'follow' }, '（加入好友）')">模擬加入好友</button>
    </div>

    <div ref="view" class="phone">
      <div v-for="(line, index) in lines" :key="index" class="msg" :class="line.from">
        <div class="bubble">{{ line.text }}</div>
        <div v-if="line.actions?.length" class="actions">
          <button v-for="action in line.actions" :key="action.label" class="qr" :disabled="busy" @click="tap(action)">
            {{ action.label }}
          </button>
        </div>
      </div>
      <p v-if="!lines.length" class="muted small center">按「模擬加入好友」或輸入訊息開始</p>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <form class="compose" @submit.prevent="sendText">
      <input v-model="input" placeholder="輸入訊息，例如：回報問題、找真人、開始檢測" :disabled="busy" />
      <button class="btn" :disabled="busy || !input.trim()">送出</button>
    </form>
  </div>
</template>

<style scoped>
.sim { max-width: 480px; width: 100%; margin: 0 auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; height: calc(100vh - 54px); }
.intro { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.intro .btn { width: auto; }
.phone { flex: 1; overflow-y: auto; background: #8cabd9; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.msg { display: flex; flex-direction: column; gap: 6px; }
.msg.user { align-items: flex-end; }
.msg.bot { align-items: flex-start; }
.bubble { max-width: 85%; white-space: pre-wrap; padding: 8px 12px; border-radius: 16px; background: #fff; color: #111; font-size: 14px; word-break: break-word; }
.msg.user .bubble { background: #06c755; color: #fff; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.qr { border: 1px solid #fff; background: rgba(255, 255, 255, 0.85); color: #111; border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.compose { display: flex; gap: 8px; }
.compose input { flex: 1; font: inherit; font-size: 16px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); min-width: 0; }
.compose .btn { width: auto; padding: 0 18px; }
.center { text-align: center; color: #fff; }
</style>
