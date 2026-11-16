import type { QuickReplyItem, TextMessage } from './line-api'

/** What a user's free text asks for. Anything else is either part of an open
 *  ticket conversation or gets the help menu. */
export type Intent = 'check' | 'report' | 'human' | 'close' | 'history' | 'help' | 'none'

const INTENT_PATTERNS: Array<[Intent, RegExp]> = [
  ['check', /^(開始)?(檢測|測試|檢查)(引擎)?$|^引擎檢測$/],
  ['report', /^(回報|回報問題|問題回報|我要回報)$/],
  ['human', /^(找)?(真人|客服|專人|人工)(服務|客服)?$/],
  ['close', /^(結束|結束對話|關閉|完成)$/],
  ['history', /^(我的)?(紀錄|記錄|檢測紀錄|歷史)$/],
  ['help', /^(選單|menu|help|說明|幫助|\?|？)$/i],
]

export function parseIntent(text: string): Intent {
  const normalized = text.trim().replace(/\s+/g, '')
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(normalized)) return intent
  }
  return 'none'
}

export function menuQuickReply(checkUrl: string): { items: QuickReplyItem[] } {
  return {
    items: [
      { type: 'action', action: { type: 'uri', label: '🔊 開始引擎檢測', uri: checkUrl } },
      { type: 'action', action: { type: 'message', label: '📝 回報問題', text: '回報問題' } },
      { type: 'action', action: { type: 'message', label: '🙋 找真人', text: '找真人' } },
      { type: 'action', action: { type: 'message', label: '📋 我的紀錄', text: '我的紀錄' } },
    ],
  }
}

function text(body: string, checkUrl?: string): TextMessage {
  return checkUrl ? { type: 'text', text: body, quickReply: menuQuickReply(checkUrl) } : { type: 'text', text: body }
}

export const BOT_TEXT = {
  welcome: (name: string | null, checkUrl: string) =>
    text(
      `${name ? `${name} 你好！` : '你好！'}這裡是機車引擎異音檢測 🏍️\n\n` +
        '我們是學生研究團隊，正在收集機車引擎聲音，研究異音和故障的關係。\n\n' +
        '・點「開始引擎檢測」，用手機錄 18 秒引擎聲＋震動，就會收到分析結果\n' +
        '・點「回報問題」描述你的車況（可以傳文字、照片、錄音）\n' +
        '・點「找真人」由團隊成員回覆你\n\n' +
        '上傳的錄音只用於研究，不會公開。',
      checkUrl,
    ),
  help: (checkUrl: string) => text('請選擇要做什麼 👇', checkUrl),
  check: (checkUrl: string) =>
    text(
      `點下面的連結開始檢測（約 1 分鐘）：\n${checkUrl}\n\n` +
        '準備：引擎發動、車子停好、手機放在腳踏板或座墊上，前 9 秒怠速、後 9 秒輕催油門。',
      checkUrl,
    ),
  ticketOpened: (kind: 'report' | 'human') =>
    text(
      kind === 'human'
        ? '已通知線上的團隊成員，請直接在這裡描述你的問題，我們會盡快回覆 🙋\n（不需要再等待時輸入「結束」）'
        : '請描述你遇到的問題：什麼時候出現異音、聽起來像什麼、車款年份等等。\n可以直接傳文字、照片或錄音 📝\n（說完後輸入「結束」）',
    ),
  ticketAppended: () => text('收到，已轉給團隊成員 👍'),
  ticketClosed: (checkUrl: string) => text('這次的回報已結束，謝謝你的協助！有需要隨時再找我們。', checkUrl),
  noTicket: (checkUrl: string) => text('目前沒有進行中的回報。', checkUrl),
  mediaSaved: () => text('收到檔案，已附在你的回報裡 📎'),
  history: (lines: string[], checkUrl: string) =>
    text(lines.length ? `最近的檢測：\n\n${lines.join('\n')}` : '還沒有檢測紀錄，試試看「開始引擎檢測」吧！', checkUrl),
}

export const RESULT_LABEL: Record<string, string> = {
  normal: '正常',
  attention: '需要注意',
  unsure: '無法判斷',
  retake: '需要重錄',
  not_applicable: '不適用',
}

export const RESULT_ICON: Record<string, string> = {
  normal: '✅',
  attention: '⚠️',
  unsure: '❔',
  retake: '🔁',
  not_applicable: '➖',
}
