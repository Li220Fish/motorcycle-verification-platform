<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

import devLogRaw from '@/data/dev-log.json'
import { devlogService } from '@/services/firebase/devlog.service'
import type {
  CountdownState,
  DevLogCategory,
  DevLogData,
  DevLogDeletion,
  DevLogEntry,
  DevLogOverride,
  DevLogSubmissionInput,
} from '@/types/devlog'

const devLogData = devLogRaw as unknown as DevLogData
const baseEntries = devLogData.entries
const summary = devLogData.summary
const teamSummary = devLogData.teamSummary

const CAT_ORDER: DevLogCategory[] = ['前台', '後台', '系統', '檢定辨識', '開發管理']
const TYPE_LABEL: Record<string, string> = {
  feat: '功能',
  fix: '修復',
  refactor: '重構',
  chore: '雜項',
  docs: '文件',
  style: '樣式',
  test: '測試',
  perf: '效能',
  merge: '合併',
  other: '其他',
  design: '設計',
  dev: '開發',
  discuss: '討論',
  maint: '維護',
  research: '研究',
}
const SOURCE_LABEL: Record<string, string> = {
  git: 'Git',
  'manual-log': '工作日誌',
  'team-sheet': '團隊表',
  submission: '協作提交',
}
const USER_COLORS = ['#1769e8', '#7c3fc4', '#1f8f86', '#c96a12', '#22a447', '#f04438', '#0f7fae']

function userColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return USER_COLORS[h % USER_COLORS.length]
}
function initials(name: string): string {
  return (name || '?').trim().slice(0, 2).toUpperCase()
}
function fmtHours(ms: number): string {
  return (ms / 3600000).toFixed(1)
}
function fmtDuration(ms: number): string {
  const min = ms / 60000
  if (min < 60) return `${Math.round(min)} 分鐘`
  return `${(min / 60).toFixed(1)} 小時`
}
function fmtEntryTime(e: DevLogEntry): string {
  if (!e.timestamp) return '日期未定'
  const d = new Date(e.timestamp)
  if (e.timePrecision === 'day') {
    const one = d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
    if (e.endTimestamp) {
      const two = new Date(e.endTimestamp).toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
      })
      if (two !== one) return `${one}–${two}`
    }
    return one
  }
  return d.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function dayKey(e: DevLogEntry): string {
  if (!e.timestamp) return '日期未記錄'
  return new Date(e.timestamp).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}
function sortTs(e: DevLogEntry): number {
  return e.timestamp ? new Date(e.timestamp).getTime() : -Infinity
}
function durationTitle(e: DevLogEntry): string {
  if (e.source === 'team-sheet') return '團隊規劃表登記的花費時間'
  if (e.source === 'manual-log') return '使用者自估開發時數'
  if (e.source === 'submission') return '提交者填寫的時數'
  return '從對應提示到提交的間隔'
}

interface DiffLine {
  text: string
  cls: string
}
function renderDiffLines(diff: string | null): DiffLine[] {
  if (!diff) return []
  return diff.split('\n').map((line) => {
    let cls = ''
    if (/^diff --git|^index |^--- |^\+\+\+ /.test(line)) cls = 'meta'
    else if (/^@@/.test(line)) cls = 'hunk'
    else if (/^\+/.test(line)) cls = 'add'
    else if (/^-/.test(line)) cls = 'del'
    return { text: line || ' ', cls }
  })
}

// ---------- live submissions (Firestore) ----------
const submissions = ref<DevLogEntry[]>([])
let unsubscribeSubmissions: (() => void) | null = null

function normalizeSubmission(
  id: string,
  data: DevLogSubmissionInput & { submittedAt: string },
): DevLogEntry {
  // scripts/sync-devlog.mjs writes gitHash — use the commit hash itself as the
  // entry id so this doc REPLACES the matching static git entry (richer prompt
  // than whatever the last static rebuild found) instead of appearing twice.
  const isGitSync = !!data.gitHash
  return {
    id: isGitSync ? data.gitHash! : 'submission-' + id,
    source: isGitSync ? 'git' : 'submission',
    hash: data.gitHash || null,
    shortHash: data.shortHash || null,
    user: data.user || '匿名協作者',
    email: null,
    timestamp: data.timestamp || data.submittedAt || null,
    endTimestamp: null,
    timePrecision: data.timestamp ? 'minute' : 'day',
    type: data.type || 'dev',
    topic: data.topic,
    category: data.category || '系統',
    summary: data.summary || null,
    prompt: data.prompt || null,
    promptExtraCount: 0,
    files: data.files || [],
    stat: data.diff ? (isGitSync ? '即時同步的程式碼' : '協作者提交的程式碼') : null,
    diff: data.diff || null,
    diffTruncated: false,
    result: data.result || '（協作提交）',
    durationMs: data.durationHours != null ? data.durationHours * 3600000 : null,
    laborHours: null,
    priority: null,
    status: null,
    manual: !!data.manualEntry,
  }
}

// ---------- per-entry corrections (Firestore) ----------
const overrides = ref<Record<string, DevLogOverride>>({})
let unsubscribeOverrides: (() => void) | null = null

function applyOverride(entry: DevLogEntry, override: DevLogOverride | undefined): DevLogEntry {
  if (!override) return entry
  const next: DevLogEntry = { ...entry, edited: true }
  if (override.topic != null) next.topic = override.topic
  if (override.user != null) next.user = override.user
  if (override.timestamp !== undefined) {
    next.timestamp = override.timestamp
    next.timePrecision = 'minute'
  }
  if (override.category != null) next.category = override.category
  if (override.type != null) next.type = override.type
  if (override.summary !== undefined) next.summary = override.summary
  if (override.prompt !== undefined) next.prompt = override.prompt
  if (override.diff !== undefined) {
    next.diff = override.diff
    next.stat = override.diff ? '已編輯的內容' : next.stat
  }
  if (override.result !== undefined && override.result !== null) next.result = override.result
  if (override.hours !== undefined && override.hours !== null) {
    next.durationMs = override.hours * 3600000
    if (next.source === 'team-sheet') next.laborHours = override.hours
  }
  return next
}

// ---------- deletions (tombstones — Firestore) ----------
const deletions = ref<Record<string, DevLogDeletion>>({})
let unsubscribeDeletions: (() => void) | null = null

const EDITOR_NAME_KEY = 'ride-devlog-editor-name'
const editorName = ref('')
try {
  editorName.value = localStorage.getItem(EDITOR_NAME_KEY) || ''
} catch {
  editorName.value = ''
}

async function handleDelete(entry: DevLogEntry) {
  let who = editorName.value.trim()
  if (!who) {
    who = (window.prompt('請輸入你的名字（會記錄在刪除紀錄上）') || '').trim()
    if (!who) return
    editorName.value = who
    try {
      localStorage.setItem(EDITOR_NAME_KEY, who)
    } catch {
      /* private browsing — not fatal */
    }
  }
  await devlogService.deleteEntry(entry.id, { deletedBy: who, deletedAt: new Date().toISOString() })
}
async function handleRestore(entry: DevLogEntry) {
  await devlogService.restoreEntry(entry.id)
}

const allEntries = computed<DevLogEntry[]>(() => {
  const map = new Map<string, DevLogEntry>()
  for (const e of baseEntries) map.set(e.id, e)
  // a git-sync submission with the same id as a static entry replaces it
  // (richer prompt data); one with a fresh id (a commit pushed after the
  // last static rebuild, or a hand-typed .md upload) is added as new.
  for (const s of submissions.value) map.set(s.id, s)
  return Array.from(map.values()).map((e) => applyOverride(e, overrides.value[e.id]))
})

// ---------- countdown (Firestore) ----------
const countdown = ref<CountdownState | null>(null)
const countdownEditing = ref(false)
const countdownForm = reactive({ purpose: '', targetLocal: '' })
const countdownNow = ref(Date.now())
let countdownTicker: ReturnType<typeof setInterval> | null = null
let unsubscribeCountdown: (() => void) | null = null

const countdownRemaining = computed(() => {
  if (!countdown.value) return null
  const diff = new Date(countdown.value.targetIso).getTime() - countdownNow.value
  if (diff <= 0) return { expired: true, days: 0, hours: 0, mins: 0, secs: 0 }
  return {
    expired: false,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  }
})

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function openCountdownForm() {
  countdownForm.purpose = countdown.value?.purpose || ''
  countdownForm.targetLocal = countdown.value ? toLocalInputValue(countdown.value.targetIso) : ''
  countdownEditing.value = true
}
async function saveCountdownForm() {
  if (!countdownForm.purpose.trim() || !countdownForm.targetLocal) return
  const next: CountdownState = {
    purpose: countdownForm.purpose.trim(),
    targetIso: new Date(countdownForm.targetLocal).toISOString(),
    updatedAt: new Date().toISOString(),
  }
  try {
    await devlogService.saveCountdown(next)
  } catch (e) {
    countdownError.value = e instanceof Error ? e.message : '儲存失敗'
    return
  }
  countdownEditing.value = false
}
const countdownError = ref('')

// ---------- dashboard collapse (default collapsed to keep the header compact) ----------
const dashOpen = ref(false)
const dashSummary = computed(() => {
  const totalHours = fmtHours(
    Object.values(distribution.value.timedDurationByCategory).reduce((a, b) => a + b, 0),
  )
  return `${allEntries.value.length} 筆・${totalHours}h・團隊實作 ${teamSummary.actualHours}h`
})

// ---------- filters ----------
const activeCats = reactive(new Set<DevLogCategory>(CAT_ORDER))
const userFilter = ref('')
const search = ref('')
const onlyAi = ref(false)

function toggleCategory(c: DevLogCategory) {
  if (activeCats.has(c)) activeCats.delete(c)
  else activeCats.add(c)
}

const userOptions = computed(() => {
  const counts: Record<string, number> = {}
  for (const e of allEntries.value) counts[e.user] = (counts[e.user] || 0) + 1
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .map((u) => ({ user: u, count: counts[u] }))
})

const filteredEntries = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allEntries.value.filter((e) => {
    if (!activeCats.has(e.category)) return false
    if (userFilter.value && e.user !== userFilter.value) return false
    if (onlyAi.value && !e.prompt) return false
    if (q) {
      const hay = [e.topic, e.summary, e.prompt, e.user].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const kpi = computed(() => {
  const withDuration = filteredEntries.value.filter((e) => e.durationMs != null)
  const totalMs = withDuration.reduce((sum, e) => sum + (e.durationMs || 0), 0)
  const withPrompt = filteredEntries.value.filter((e) => e.prompt)
  const coverage = filteredEntries.value.length
    ? Math.round((withPrompt.length / filteredEntries.value.length) * 100)
    : 0
  const userCount = new Set(filteredEntries.value.map((e) => e.user)).size
  return {
    count: filteredEntries.value.length,
    userCount,
    hours: fmtHours(totalMs),
    withPromptCount: withPrompt.length,
    coverage,
  }
})

const groupedByDay = computed(() => {
  const sorted = [...filteredEntries.value].sort((a, b) => sortTs(b) - sortTs(a))
  const groups: Array<{ key: string; items: DevLogEntry[] }> = []
  let lastKey: string | null = null
  for (const e of sorted) {
    const k = dayKey(e)
    if (k !== lastKey) {
      groups.push({ key: k, items: [] })
      lastKey = k
    }
    groups[groups.length - 1].items.push(e)
  }
  return groups
})

// ---------- static distribution panels (all entries, not filter-reactive) ----------
const distribution = computed(() => {
  const byCategory: Record<string, number> = {}
  const byUser: Record<string, number> = {}
  const timedDurationByCategory: Record<string, number> = {}
  for (const e of allEntries.value) {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1
    byUser[e.user] = (byUser[e.user] || 0) + 1
    if (e.durationMs != null)
      timedDurationByCategory[e.category] =
        (timedDurationByCategory[e.category] || 0) + e.durationMs
  }
  return { byCategory, byUser, timedDurationByCategory }
})

const maxCatCount = computed(() =>
  Math.max(...CAT_ORDER.map((c) => distribution.value.byCategory[c] || 0), 1),
)
const maxCatHours = computed(() =>
  Math.max(...CAT_ORDER.map((c) => distribution.value.timedDurationByCategory[c] || 0), 1),
)

const userHoursRows = computed(() => {
  const byUserLaborHours: Record<string, number> = {}
  for (const e of allEntries.value) {
    if (e.laborHours != null)
      byUserLaborHours[e.user] = (byUserLaborHours[e.user] || 0) + e.laborHours
  }
  const rows = Object.entries(byUserLaborHours).sort((a, b) => b[1] - a[1])
  const max = Math.max(...rows.map(([, h]) => h), 1)
  const total = rows.reduce((sum, [, h]) => sum + h, 0)
  return { rows, max, total }
})

const userSubmitRows = computed(() => {
  const rows = Object.entries(distribution.value.byUser).sort((a, b) => b[1] - a[1])
  const max = Math.max(...rows.map(([, c]) => c), 1)
  return { rows, max }
})

const teamTypeColor: Record<string, string> = {
  討論: 'var(--color-text-disabled)',
  '開發/創作': 'var(--color-success)',
  '測試/實驗': 'var(--color-primary)',
  維護: 'var(--color-warning)',
}
const maxTeamType = computed(() => Math.max(...Object.values(teamSummary.byType), 1))

// ---------- markdown submission template + parser ----------
const TEMPLATE_MD = `# 在這裡填入項目主題

- 使用者：你的名字
- 時間：2026-09-10 14:30
- 分類：前台
- 類型：開發/創作

## Prompt
（貼上你當時輸入給 Claude 或其他工具的 prompt，若無則刪除此區塊）

## 摘要
（一兩句話描述做了什麼、為什麼）

## 產出程式碼
\`\`\`
（可貼程式碼、SQL 或指令片段；若無則刪除此區塊）
\`\`\`

## 結果
（結果、狀態或後續待辦）

## 時數
2.5
`

interface ParsedSubmission {
  topic: string
  user: string | null
  timestamp: string | null
  category: DevLogCategory
  type: string
  prompt: string | null
  summary: string | null
  diff: string | null
  result: string | null
  durationHours: number | null
}

function parseSubmissionMarkdown(md: string): ParsedSubmission {
  const lines = md.split(/\r?\n/)
  let topic: string | null = null
  const meta: Record<string, string> = {}
  const sections: Record<string, string> = {}
  let currentSection: string | null = null
  let buf: string[] = []
  function flush() {
    if (currentSection) sections[currentSection] = buf.join('\n').trim()
    buf = []
  }
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/)
    const h2 = line.match(/^##\s*(.+?)\s*$/)
    const metaLine = line.match(/^-\s*(使用者|時間|分類|類型)[:：]\s*(.+)/)
    if (h1 && topic === null) {
      topic = h1[1].trim()
      continue
    }
    if (h2) {
      flush()
      currentSection = h2[1].trim()
      continue
    }
    if (metaLine && !currentSection) {
      meta[metaLine[1]] = metaLine[2].trim()
      continue
    }
    if (currentSection) buf.push(line)
  }
  flush()

  function cleanCode(s: string | undefined): string | null {
    if (!s) return null
    const cleaned = s
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```\s*$/, '')
      .trim()
    return cleaned || null
  }

  const CATS: DevLogCategory[] = ['前台', '後台', '系統', '檢定辨識']
  const TYPES: Record<string, string> = {
    討論: 'discuss',
    '開發/創作': 'dev',
    '測試/實驗': 'test',
    維護: 'maint',
    設計: 'design',
    研究: 'research',
  }

  let timestamp: string | null = null
  if (meta['時間']) {
    const d = new Date(meta['時間'].replace(' ', 'T'))
    if (!isNaN(d.getTime())) timestamp = d.toISOString()
  }

  const hoursRaw = sections['時數'] ? parseFloat(sections['時數']) : NaN

  return {
    topic: topic || '未命名項目',
    user: meta['使用者'] || null,
    timestamp,
    category: (CATS as string[]).includes(meta['分類']) ? (meta['分類'] as DevLogCategory) : '系統',
    type: TYPES[meta['類型']] || 'dev',
    prompt: sections['Prompt'] || null,
    summary: sections['摘要'] || null,
    diff: cleanCode(sections['產出程式碼']),
    result: sections['結果'] || null,
    durationHours: isNaN(hoursRaw) ? null : hoursRaw,
  }
}

// ---------- inline entry editing (per-entry correction, e.g. backfilling
// hours a teammate's work never got logged with) ----------
const editingId = ref<string | null>(null)
const editDraft = reactive({
  topic: '',
  user: '',
  timeLocal: '',
  category: '系統' as DevLogCategory,
  hours: '',
  summary: '',
  prompt: '',
  diff: '',
  result: '',
})
const editStatus = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)
const editSaving = ref(false)

function openEdit(entry: DevLogEntry) {
  editingId.value = entry.id
  editDraft.topic = entry.topic
  editDraft.user = entry.user
  editDraft.timeLocal = entry.timestamp ? toLocalInputValue(entry.timestamp) : ''
  editDraft.category = entry.category
  editDraft.hours = entry.durationMs != null ? String(entry.durationMs / 3600000) : ''
  editDraft.summary = entry.summary || ''
  editDraft.prompt = entry.prompt || ''
  editDraft.diff = entry.diff || ''
  editDraft.result = entry.result || ''
  editStatus.value = null
}
function cancelEdit() {
  editingId.value = null
}
async function saveEdit(entry: DevLogEntry) {
  const who = editorName.value.trim()
  if (!who) {
    editStatus.value = { kind: 'err', text: '請先填寫你的名字，方便其他人知道是誰改的' }
    return
  }
  try {
    localStorage.setItem(EDITOR_NAME_KEY, who)
  } catch {
    /* private browsing — not fatal */
  }
  editSaving.value = true
  editStatus.value = null
  const override: DevLogOverride = {
    topic: editDraft.topic.trim() || entry.topic,
    user: editDraft.user.trim() || entry.user,
    timestamp: editDraft.timeLocal ? new Date(editDraft.timeLocal).toISOString() : null,
    category: editDraft.category,
    summary: editDraft.summary.trim() || null,
    prompt: editDraft.prompt.trim() || null,
    diff: editDraft.diff.trim() || null,
    result: editDraft.result.trim() || null,
    hours: editDraft.hours ? parseFloat(editDraft.hours) : null,
    updatedBy: who,
    updatedAt: new Date().toISOString(),
  }
  try {
    await devlogService.saveOverride(entry.id, override)
    editingId.value = null
  } catch (e) {
    editStatus.value = {
      kind: 'err',
      text: '儲存失敗：' + (e instanceof Error ? e.message : '未知錯誤'),
    }
  } finally {
    editSaving.value = false
  }
}

// ---------- upload UI state ----------
const fileInput = ref<HTMLInputElement | null>(null)
const uploadPreview = ref<ParsedSubmission | null>(null)
const uploadRawMd = ref('')
const uploadDraft = reactive({
  topic: '',
  user: '',
  timeLocal: '',
  category: '系統' as DevLogCategory,
  hours: '',
  summary: '',
  prompt: '',
  diff: '',
  result: '',
})
const uploadStatus = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)
const uploadSubmitting = ref(false)
const showTemplate = ref(false)

function openFilePicker() {
  fileInput.value?.click()
}
function onFileChosen(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result)
    const parsed = parseSubmissionMarkdown(text)
    uploadPreview.value = parsed
    uploadRawMd.value = text
    uploadDraft.topic = parsed.topic
    uploadDraft.user = parsed.user || ''
    uploadDraft.timeLocal = parsed.timestamp ? toLocalInputValue(parsed.timestamp) : ''
    uploadDraft.category = parsed.category
    uploadDraft.hours = parsed.durationHours != null ? String(parsed.durationHours) : ''
    uploadDraft.summary = parsed.summary || ''
    uploadDraft.prompt = parsed.prompt || ''
    uploadDraft.diff = parsed.diff || ''
    uploadDraft.result = parsed.result || ''
    uploadStatus.value = null
  }
  reader.readAsText(file)
  input.value = ''
}
function cancelUpload() {
  uploadPreview.value = null
  uploadStatus.value = null
}
async function submitUpload() {
  uploadSubmitting.value = true
  uploadStatus.value = null
  const input: DevLogSubmissionInput = {
    topic: uploadDraft.topic.trim() || '未命名項目',
    user: uploadDraft.user.trim() || '匿名協作者',
    timestamp: uploadDraft.timeLocal ? new Date(uploadDraft.timeLocal).toISOString() : null,
    category: uploadDraft.category,
    type: uploadPreview.value?.type || 'dev',
    summary: uploadDraft.summary.trim() || null,
    prompt: uploadDraft.prompt.trim() || null,
    diff: uploadDraft.diff.trim() || null,
    result: uploadDraft.result.trim() || null,
    durationHours: uploadDraft.hours ? parseFloat(uploadDraft.hours) : null,
    rawMarkdown: uploadRawMd.value,
  }
  try {
    await devlogService.addSubmission(input)
    uploadStatus.value = { kind: 'ok', text: '已送出，感謝協作！' }
    setTimeout(() => {
      uploadPreview.value = null
    }, 1200)
  } catch (e) {
    uploadStatus.value = {
      kind: 'err',
      text: '送出失敗：' + (e instanceof Error ? e.message : '未知錯誤'),
    }
  } finally {
    uploadSubmitting.value = false
  }
}
function downloadTemplate() {
  const blob = new Blob([TEMPLATE_MD], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '工作記錄範本.md'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ---------- quick-add (floating "+" button — typed straight in, no .md file) ----------
const quickAddOpen = ref(false)
const quickAddDraft = reactive({
  topic: '',
  user: '',
  timeLocal: '',
  category: '系統' as DevLogCategory,
  type: 'dev',
  hours: '',
  summary: '',
  prompt: '',
  diff: '',
  result: '',
})
const quickAddStatus = ref<{ kind: 'ok' | 'err'; text: string } | null>(null)
const quickAddSubmitting = ref(false)

function openQuickAdd() {
  quickAddDraft.topic = ''
  quickAddDraft.user = editorName.value
  quickAddDraft.timeLocal = toLocalInputValue(new Date().toISOString())
  quickAddDraft.category = '系統'
  quickAddDraft.type = 'dev'
  quickAddDraft.hours = ''
  quickAddDraft.summary = ''
  quickAddDraft.prompt = ''
  quickAddDraft.diff = ''
  quickAddDraft.result = ''
  quickAddStatus.value = null
  quickAddOpen.value = true
}
async function submitQuickAdd() {
  if (!quickAddDraft.topic.trim()) {
    quickAddStatus.value = { kind: 'err', text: '請至少填寫主題' }
    return
  }
  quickAddSubmitting.value = true
  quickAddStatus.value = null
  const input: DevLogSubmissionInput = {
    topic: quickAddDraft.topic.trim(),
    user: quickAddDraft.user.trim() || '匿名協作者',
    timestamp: quickAddDraft.timeLocal ? new Date(quickAddDraft.timeLocal).toISOString() : null,
    category: quickAddDraft.category,
    type: quickAddDraft.type,
    summary: quickAddDraft.summary.trim() || null,
    prompt: quickAddDraft.prompt.trim() || null,
    diff: quickAddDraft.diff.trim() || null,
    result: quickAddDraft.result.trim() || null,
    durationHours: quickAddDraft.hours ? parseFloat(quickAddDraft.hours) : null,
    rawMarkdown: '',
    manualEntry: true,
  }
  try {
    if (quickAddDraft.user.trim()) {
      editorName.value = quickAddDraft.user.trim()
      try {
        localStorage.setItem(EDITOR_NAME_KEY, editorName.value)
      } catch {
        /* private browsing — not fatal */
      }
    }
    await devlogService.addSubmission(input)
    quickAddStatus.value = { kind: 'ok', text: '已新增！' }
    setTimeout(() => {
      quickAddOpen.value = false
    }, 800)
  } catch (e) {
    quickAddStatus.value = {
      kind: 'err',
      text: '新增失敗：' + (e instanceof Error ? e.message : '未知錯誤'),
    }
  } finally {
    quickAddSubmitting.value = false
  }
}

// ---------- CSV export (floating "✕" button) ----------
function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}
function exportCsv() {
  const rows: string[][] = [['時間戳記', '分類', '目的', '開發者', '標題', '工時']]
  const list = allEntries.value.filter((e) => !deletions.value[e.id])
  for (const e of list) {
    const hours = e.durationMs != null ? (e.durationMs / 3600000).toFixed(2) : ''
    rows.push([e.timestamp || '', e.category, TYPE_LABEL[e.type] || e.type, e.user, e.topic, hours])
  }
  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `騎吧開發誌_${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const DEVLOG_PROMPT =
  '那你把我在此專案中迄今新開發的內容的以.md方式列出，內容需包含使用者、時間戳記、主題、分類（前台、後台、系統、檢定辨識）、摘要、prompt、產出的source code（可收合）、 結果，並量化開發的時間。'
const copyPromptStatus = ref('')
let copyPromptStatusTimer: ReturnType<typeof setTimeout> | null = null

async function copyDevLogPrompt() {
  try {
    await navigator.clipboard.writeText(DEVLOG_PROMPT)
    copyPromptStatus.value = '已複製，貼給你自己的 Claude 就能產生範本內容'
  } catch {
    copyPromptStatus.value = '複製失敗，請手動選取文字複製'
  }
  if (copyPromptStatusTimer) clearTimeout(copyPromptStatusTimer)
  copyPromptStatusTimer = setTimeout(() => {
    copyPromptStatus.value = ''
  }, 4000)
}

// ---------- sticky day-heading offset tracks the (dynamically sized) header ----------
const headerEl = ref<HTMLElement | null>(null)
let headerResizeObserver: ResizeObserver | null = null

// ---------- lifecycle ----------
onMounted(() => {
  unsubscribeSubmissions = devlogService.subscribeSubmissions((docs) => {
    submissions.value = docs.map((d) => normalizeSubmission(d.id, d.data))
  })
  unsubscribeCountdown = devlogService.subscribeCountdown((state) => {
    countdown.value = state
  })
  unsubscribeOverrides = devlogService.subscribeOverrides((map) => {
    overrides.value = map
  })
  unsubscribeDeletions = devlogService.subscribeDeletions((map) => {
    deletions.value = map
  })
  countdownTicker = setInterval(() => {
    countdownNow.value = Date.now()
  }, 1000)

  if (headerEl.value) {
    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--header-h',
        `${headerEl.value?.offsetHeight ?? 0}px`,
      )
    }
    headerResizeObserver = new ResizeObserver(syncHeaderHeight)
    headerResizeObserver.observe(headerEl.value)
    syncHeaderHeight()
  }
})
onUnmounted(() => {
  unsubscribeSubmissions?.()
  unsubscribeCountdown?.()
  unsubscribeOverrides?.()
  unsubscribeDeletions?.()
  if (countdownTicker) clearInterval(countdownTicker)
  if (copyPromptStatusTimer) clearTimeout(copyPromptStatusTimer)
  headerResizeObserver?.disconnect()
})
</script>

<template>
  <div class="devlog">
    <header ref="headerEl" class="top">
      <div class="brand">
        <h1>騎吧<span>開發誌</span></h1>
        <span class="tagline">RIDE 騎吧・團隊開發時間軸</span>
      </div>

      <div class="countdown">
        <template v-if="!countdownEditing">
          <template v-if="countdown && countdownRemaining">
            <div class="countdown-main">
              <span class="countdown-purpose">{{ countdown.purpose }}</span>
              <span class="countdown-value num">
                <template v-if="countdownRemaining.expired">已到期</template>
                <template v-else
                  >{{ countdownRemaining.days }}<span class="u">天</span
                  >{{ pad2(countdownRemaining.hours) }}<span class="u">:</span
                  >{{ pad2(countdownRemaining.mins) }}<span class="u">:</span
                  >{{ pad2(countdownRemaining.secs) }}</template
                >
              </span>
            </div>
            <button class="countdown-edit-btn" type="button" @click="openCountdownForm">
              編輯
            </button>
          </template>
          <template v-else>
            <div class="countdown-empty">尚未設定倒數計時目標</div>
            <button class="countdown-edit-btn" type="button" @click="openCountdownForm">
              設定倒數計時
            </button>
          </template>
        </template>
        <form v-else class="countdown-form" @submit.prevent="saveCountdownForm">
          <input
            v-model="countdownForm.purpose"
            type="text"
            placeholder="倒數計時目的（例如：Demo 簡報）"
            required
          />
          <input v-model="countdownForm.targetLocal" type="datetime-local" required />
          <button type="submit">儲存</button>
          <button type="button" class="ghost" @click="countdownEditing = false">取消</button>
          <span v-if="countdownError" class="countdown-sync-note err">{{ countdownError }}</span>
          <span v-else class="countdown-sync-note">會同步給所有開啟此頁面的協作者</span>
        </form>
      </div>

      <div class="dash-toggle">
        <button
          type="button"
          :aria-expanded="dashOpen"
          aria-controls="dash-body"
          @click="dashOpen = !dashOpen"
        >
          <svg class="chev" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          儀表板
        </button>
        <span class="dash-summary num">{{ dashSummary }}</span>
      </div>

      <div id="dash-body" class="dash-body" :class="{ open: dashOpen }">
        <div class="stats">
          <div class="stat-tile">
            <div class="label">累積紀錄項目</div>
            <div class="value num">{{ kpi.count }}<span class="unit">筆</span></div>
            <div class="sub">{{ kpi.userCount }} 位協作者</div>
          </div>
          <div class="stat-tile">
            <div class="label">量化開發時間</div>
            <div class="value num">{{ kpi.hours }}<span class="unit">小時</span></div>
            <div class="sub">跨來源加總，可能重疊</div>
          </div>
          <div class="stat-tile">
            <div class="label">AI 協作覆蓋率</div>
            <div class="value num">{{ kpi.coverage }}<span class="unit">%</span></div>
            <div class="sub">{{ kpi.withPromptCount }} 筆有對應 prompt</div>
          </div>
          <div class="stat-tile bar-tile">
            <div class="label">分類佔比（項目數）</div>
            <div v-for="c in CAT_ORDER" :key="c" class="bar-row">
              <span class="bar-dot" :style="{ background: `var(--cat-${c})` }"></span>
              <span class="cat-label">{{ c }}</span>
              <span class="bar-track"
                ><span
                  class="bar-fill"
                  :style="{
                    width: ((distribution.byCategory[c] || 0) / maxCatCount) * 100 + '%',
                    background: `var(--cat-${c})`,
                  }"
                ></span
              ></span>
              <span class="cat-val num">{{ distribution.byCategory[c] || 0 }}</span>
            </div>
          </div>
          <div class="stat-tile bar-tile">
            <div class="label">分類佔比（量化時數）</div>
            <div v-for="c in CAT_ORDER" :key="c" class="bar-row">
              <span class="bar-dot" :style="{ background: `var(--cat-${c})` }"></span>
              <span class="cat-label">{{ c }}</span>
              <span class="bar-track"
                ><span
                  class="bar-fill"
                  :style="{
                    width:
                      ((distribution.timedDurationByCategory[c] || 0) / maxCatHours) * 100 + '%',
                    background: `var(--cat-${c})`,
                  }"
                ></span
              ></span>
              <span class="cat-val num"
                >{{ fmtHours(distribution.timedDurationByCategory[c] || 0) }}h</span
              >
            </div>
          </div>

          <div class="stat-tile">
            <div class="label">團隊預估工時</div>
            <div class="value num">
              {{ teamSummary.estimatedHours }}<span class="unit">小時</span>
            </div>
            <div class="sub">來自團隊規劃表</div>
          </div>
          <div class="stat-tile">
            <div class="label">團隊實作工時</div>
            <div class="value num">{{ teamSummary.actualHours }}<span class="unit">小時</span></div>
            <div class="sub">來自團隊規劃表</div>
          </div>
          <div class="stat-tile">
            <div class="label">團隊達成率</div>
            <div class="value num">{{ teamSummary.completionRate }}<span class="unit">%</span></div>
            <div class="sub">已結案項目比例</div>
          </div>
          <div class="stat-tile bar-tile">
            <div class="label">各類型事務花費時間</div>
            <div v-for="[t, h] in Object.entries(teamSummary.byType)" :key="t" class="bar-row">
              <span
                class="bar-dot"
                :style="{ background: teamTypeColor[t] || 'var(--color-text-disabled)' }"
              ></span>
              <span class="cat-label">{{ t }}</span>
              <span class="bar-track"
                ><span
                  class="bar-fill"
                  :style="{
                    width: (h / maxTeamType) * 100 + '%',
                    background: teamTypeColor[t] || 'var(--color-text-disabled)',
                  }"
                ></span
              ></span>
              <span class="cat-val num">{{ h }}h</span>
            </div>
          </div>
          <div class="stat-tile bar-tile">
            <div class="label">各使用者工時（團隊規劃表）</div>
            <div v-for="[u, h] in userHoursRows.rows" :key="u" class="bar-row">
              <span class="bar-dot" :style="{ background: userColor(u) }"></span>
              <span class="cat-label wide">{{ u }}</span>
              <span class="bar-track"
                ><span
                  class="bar-fill"
                  :style="{ width: (h / userHoursRows.max) * 100 + '%', background: userColor(u) }"
                ></span
              ></span>
              <span class="cat-val num">{{ h.toFixed(1) }}h</span>
            </div>
            <div class="bar-row total-row">
              <span class="bar-dot" style="background: transparent"></span>
              <span class="cat-label wide">總工時</span>
              <span class="bar-track"></span>
              <span class="cat-val num">{{ userHoursRows.total.toFixed(1) }}h</span>
            </div>
          </div>
          <div class="stat-tile bar-tile">
            <div class="label">各使用者提交數（全部來源）</div>
            <div v-for="[u, c] in userSubmitRows.rows" :key="u" class="bar-row">
              <span class="bar-dot" :style="{ background: userColor(u) }"></span>
              <span class="cat-label wide">{{ u }}</span>
              <span class="bar-track"
                ><span
                  class="bar-fill"
                  :style="{ width: (c / userSubmitRows.max) * 100 + '%', background: userColor(u) }"
                ></span
              ></span>
              <span class="cat-val num">{{ c }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="filters">
        <div role="group" aria-label="分類篩選">
          <button
            v-for="c in CAT_ORDER"
            :key="c"
            type="button"
            class="pill"
            :class="'cat-' + c"
            :aria-pressed="activeCats.has(c)"
            @click="toggleCategory(c)"
          >
            {{ c }}
          </button>
        </div>
        <select v-model="userFilter" aria-label="依使用者篩選">
          <option value="">所有使用者</option>
          <option v-for="o in userOptions" :key="o.user" :value="o.user">
            {{ o.user }}（{{ o.count }}）
          </option>
        </select>
        <input v-model="search" type="search" placeholder="搜尋主題、摘要、prompt…" />
        <label class="check"><input v-model="onlyAi" type="checkbox" /> 僅顯示有 AI 協作紀錄</label>
        <span class="spacer"></span>
        <span class="count-readout"
          >顯示 {{ filteredEntries.length }} / {{ allEntries.length }} 筆</span
        >
      </div>

      <div class="upload-bar">
        <button class="upload-btn" type="button" @click="openFilePicker">
          ＋ 上傳工作記錄（.md）
        </button>
        <button class="template-btn" type="button" @click="showTemplate = !showTemplate">
          {{ showTemplate ? '關閉範本' : '查看範本' }}
        </button>
        <button class="template-btn" type="button" @click="downloadTemplate">下載範本 .md</button>
        <button class="template-btn" type="button" @click="copyDevLogPrompt">
          複製日誌md prompt
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".md,.markdown,text/markdown"
          hidden
          @change="onFileChosen"
        />
        <span v-if="copyPromptStatus" class="upload-note">{{ copyPromptStatus }}</span>
      </div>

      <div v-if="showTemplate" class="upload-panel">
        <h3>工作記錄範本</h3>
        <textarea class="template-text" readonly :value="TEMPLATE_MD"></textarea>
      </div>

      <div v-if="uploadPreview" class="upload-panel">
        <h3>確認提交內容</h3>
        <div class="upload-grid">
          <label>主題<input v-model="uploadDraft.topic" type="text" /></label>
          <label
            >使用者<input v-model="uploadDraft.user" type="text" placeholder="你的名字"
          /></label>
          <label>時間<input v-model="uploadDraft.timeLocal" type="datetime-local" /></label>
          <label
            >分類
            <select v-model="uploadDraft.category">
              <option v-for="c in CAT_ORDER" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>時數<input v-model="uploadDraft.hours" type="number" step="0.5" /></label>
        </div>
        <label>摘要<textarea v-model="uploadDraft.summary"></textarea></label>
        <label>Prompt<textarea v-model="uploadDraft.prompt"></textarea></label>
        <label>產出程式碼<textarea v-model="uploadDraft.diff" class="mono"></textarea></label>
        <label>結果<textarea v-model="uploadDraft.result"></textarea></label>
        <div v-if="uploadStatus" class="upload-status" :class="uploadStatus.kind">
          {{ uploadStatus.text }}
        </div>
        <div class="upload-actions">
          <button class="template-btn" type="button" @click="cancelUpload">取消</button>
          <button
            class="upload-btn"
            type="button"
            :disabled="uploadSubmitting"
            @click="submitUpload"
          >
            確認送出
          </button>
        </div>
      </div>
    </header>

    <main>
      <div v-if="!filteredEntries.length" class="no-results">沒有符合條件的紀錄</div>
      <div v-for="g in groupedByDay" :key="g.key" class="day-group">
        <div class="day-heading">{{ g.key }}</div>
        <ol class="entries">
          <li v-for="e in g.items" :key="e.id" class="entry" :class="'cat-' + e.category">
            <div v-if="deletions[e.id]" class="card tombstone">
              <span class="time-chip num">{{ fmtEntryTime(e) }}</span>
              <span class="topic strike">{{ e.topic }}</span>
              <span class="tombstone-note"
                >已於 {{ new Date(deletions[e.id].deletedAt).toLocaleString('zh-TW') }} 由
                {{ deletions[e.id].deletedBy }} 刪除</span
              >
              <button type="button" class="edit-btn" @click="handleRestore(e)">還原</button>
            </div>
            <details v-else class="card">
              <summary>
                <svg class="chevron" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="time-chip num">{{ fmtEntryTime(e) }}</span>
                <span class="src-badge">{{ SOURCE_LABEL[e.source] || e.source }}</span>
                <span class="badge" :class="'cat-' + e.category">{{ e.category }}</span>
                <span class="tag" :class="e.type">{{ TYPE_LABEL[e.type] || e.type }}</span>
                <span v-if="e.edited" class="src-badge edited">已編輯</span>
                <span v-if="e.manual" class="src-badge manual">手動新增</span>
                <span class="topic">{{ e.topic }}</span>
                <span class="user-chip"
                  ><span
                    class="avatar"
                    :style="{ background: userColor(e.user) + '22', color: userColor(e.user) }"
                    >{{ initials(e.user) }}</span
                  >{{ e.user }}</span
                >
                <span
                  class="dur-chip"
                  :class="{ timed: e.durationMs != null }"
                  :title="e.durationMs != null ? durationTitle(e) : '無法量化此項目的時間'"
                >
                  ⏱ {{ e.durationMs != null ? fmtDuration(e.durationMs) : '未記錄' }}
                </span>
              </summary>
              <div class="card-body">
                <div v-if="e.summary" class="field">
                  <span class="field-label">摘要</span>
                  <div class="summary-text">{{ e.summary }}</div>
                </div>
                <div class="field">
                  <span class="field-label">Prompt</span>
                  <div v-if="e.prompt" class="prompt-box">{{ e.prompt }}</div>
                  <div v-else class="prompt-box empty">（此項目無對應的逐字 prompt 紀錄）</div>
                  <div v-if="e.promptExtraCount" class="prompt-extra">
                    ＋此對話中另有 {{ e.promptExtraCount }} 則後續訊息（追問／修正）
                  </div>
                </div>
                <div class="field">
                  <span class="field-label">產出的 Source Code</span>
                  <details v-if="e.diff" class="diff-details">
                    <summary>
                      <svg class="chevron" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M6 3l5 5-5 5"
                          stroke="currentColor"
                          stroke-width="1.6"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      {{ (e.stat || '檢視內容').split('\n').pop() }}
                    </summary>
                    <div class="diff-scroll">
                      <pre
                        class="diff"
                      ><span v-for="(l, i) in renderDiffLines(e.diff)" :key="i" class="line" :class="l.cls">{{ l.text }}</span></pre>
                    </div>
                    <div v-if="e.diffTruncated" class="diff-truncated-note">
                      內容過長，已截斷顯示。
                    </div>
                  </details>
                  <div v-else class="no-diff-note">（無程式碼內容可顯示）</div>
                </div>
                <div v-if="e.files.length" class="field">
                  <span class="field-label">變更檔案</span>
                  <div class="files-list">
                    <span v-for="f in e.files" :key="f" class="file-chip">{{ f }}</span>
                  </div>
                </div>
                <div class="result-line">
                  <span class="result-dot"></span>{{ e.result }}
                  <span v-if="e.status" class="status-chip" :class="'st-' + e.status">{{
                    e.status
                  }}</span>
                  <span v-if="e.priority" class="src-badge">{{ e.priority }}</span>
                  <span v-if="e.shortHash" class="hash">{{ e.shortHash }}</span>
                  <button
                    v-if="editingId !== e.id"
                    type="button"
                    class="edit-btn"
                    @click="openEdit(e)"
                  >
                    ✎ 編輯
                  </button>
                  <button type="button" class="edit-btn danger" @click="handleDelete(e)">
                    🗑 刪除
                  </button>
                </div>

                <div v-if="editingId === e.id" class="upload-panel edit-panel">
                  <h3>編輯這筆紀錄</h3>
                  <div class="upload-grid">
                    <label>主題<input v-model="editDraft.topic" type="text" /></label>
                    <label>使用者<input v-model="editDraft.user" type="text" /></label>
                    <label>時間<input v-model="editDraft.timeLocal" type="datetime-local" /></label>
                    <label
                      >分類
                      <select v-model="editDraft.category">
                        <option v-for="c in CAT_ORDER" :key="c" :value="c">{{ c }}</option>
                      </select>
                    </label>
                    <label>時數<input v-model="editDraft.hours" type="number" step="0.5" /></label>
                    <label
                      >你的名字<input
                        v-model="editorName"
                        type="text"
                        placeholder="方便其他人知道是誰改的"
                    /></label>
                  </div>
                  <label>摘要<textarea v-model="editDraft.summary"></textarea></label>
                  <label>Prompt<textarea v-model="editDraft.prompt"></textarea></label>
                  <label
                    >產出程式碼<textarea v-model="editDraft.diff" class="mono"></textarea>
                  </label>
                  <label>結果<textarea v-model="editDraft.result"></textarea></label>
                  <div v-if="editStatus" class="upload-status" :class="editStatus.kind">
                    {{ editStatus.text }}
                  </div>
                  <div class="upload-actions">
                    <button class="template-btn" type="button" @click="cancelEdit">取消</button>
                    <button
                      class="upload-btn"
                      type="button"
                      :disabled="editSaving"
                      @click="saveEdit(e)"
                    >
                      儲存修改
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </li>
        </ol>
      </div>
    </main>

    <footer class="foot">
      資料產生於 {{ new Date(summary.generatedAt).toLocaleString('zh-TW') }}，彙整自 git
      log、工作日誌與團隊規劃表；協作提交即時同步。
    </footer>

    <div v-if="quickAddOpen" class="upload-panel quick-add-panel">
      <h3>手動新增時間軸項目</h3>
      <p class="quick-add-hint">
        這筆會標註「手動新增」，跟自動彙整（Git／工作日誌／團隊表）與 .md 上傳區隔開。
      </p>
      <div class="upload-grid">
        <label>主題<input v-model="quickAddDraft.topic" type="text" placeholder="必填" /></label>
        <label
          >使用者<input v-model="quickAddDraft.user" type="text" placeholder="你的名字"
        /></label>
        <label>時間<input v-model="quickAddDraft.timeLocal" type="datetime-local" /></label>
        <label
          >分類
          <select v-model="quickAddDraft.category">
            <option v-for="c in CAT_ORDER" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label
          >目的
          <select v-model="quickAddDraft.type">
            <option v-for="[k, v] in Object.entries(TYPE_LABEL)" :key="k" :value="k">
              {{ v }}
            </option>
          </select>
        </label>
        <label>時數<input v-model="quickAddDraft.hours" type="number" step="0.5" /></label>
      </div>
      <label>摘要<textarea v-model="quickAddDraft.summary"></textarea></label>
      <label>Prompt<textarea v-model="quickAddDraft.prompt"></textarea></label>
      <label>產出程式碼<textarea v-model="quickAddDraft.diff" class="mono"></textarea></label>
      <label>結果<textarea v-model="quickAddDraft.result"></textarea></label>
      <div v-if="quickAddStatus" class="upload-status" :class="quickAddStatus.kind">
        {{ quickAddStatus.text }}
      </div>
      <div class="upload-actions">
        <button class="template-btn" type="button" @click="quickAddOpen = false">取消</button>
        <button
          class="upload-btn"
          type="button"
          :disabled="quickAddSubmitting"
          @click="submitQuickAdd"
        >
          新增到時間軸
        </button>
      </div>
    </div>

    <div class="fab-stack">
      <button type="button" class="fab fab-add" title="手動新增時間軸項目" @click="openQuickAdd">
        +
      </button>
      <button type="button" class="fab fab-csv" title="匯出時間軸 CSV" @click="exportCsv">✕</button>
    </div>
  </div>
</template>

<style scoped>
.devlog {
  --cat-前台: var(--color-primary);
  --cat-前台-bg: var(--color-primary-bg);
  --cat-後台: #7c3fc4;
  --cat-後台-bg: #f0e7fb;
  --cat-系統: #1f8f86;
  --cat-系統-bg: #e2f3f1;
  --cat-檢定辨識: var(--color-success);
  --cat-檢定辨識-bg: var(--color-success-bg);
  --cat-開發管理: var(--color-warning);
  --cat-開發管理-bg: var(--color-warning-bg);

  --status-Done: var(--color-success);
  --status-Doing: var(--color-primary);
  --status-Ready: var(--color-text-disabled);
  --status-Test: var(--color-warning);
  --status-Blocked: var(--color-danger);

  --diff-add-bg: var(--color-success-bg);
  --diff-add-fg: var(--color-success);
  --diff-del-bg: var(--color-danger-bg);
  --diff-del-fg: var(--color-danger);
  --diff-hunk: var(--color-primary);
  --diff-meta: var(--color-text-disabled);

  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.6;
}
:root[data-theme='dark'] .devlog {
  --cat-後台: #b98af0;
  --cat-後台-bg: #2c2140;
  --cat-系統: #4fd0c4;
  --cat-系統-bg: #163330;
}
.num {
  font-variant-numeric: tabular-nums;
}

.top {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: 18px 28px 14px;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.brand h1 {
  font-weight: 700;
  font-size: 22px;
  margin: 0;
}
.brand h1 span {
  color: var(--color-primary);
}
.brand .tagline {
  color: var(--color-text-secondary);
  font-size: 12.5px;
}

.countdown {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 7px 14px;
  box-shadow: var(--shadow-card);
}
.countdown-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.countdown-purpose {
  font-weight: 600;
  font-size: 12.5px;
}
.countdown-value {
  font-weight: 700;
  font-size: 21px;
  color: var(--color-primary);
}
.countdown-value .u {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin: 0 2px 0 1px;
}
.countdown-empty {
  color: var(--color-text-disabled);
  font-size: 12px;
  font-style: italic;
}
.countdown-edit-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  margin-left: auto;
}
.countdown-edit-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.countdown-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
}
.countdown-form input[type='text'],
.countdown-form input[type='datetime-local'] {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 12.5px;
  font-family: inherit;
}
.countdown-form input[type='text'] {
  flex: 1 1 200px;
}
.countdown-form button {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.countdown-form button.ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
.countdown-sync-note {
  font-size: 10px;
  color: var(--color-text-disabled);
  width: 100%;
}
.countdown-sync-note.err {
  color: var(--color-danger);
}

.dash-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--color-text-secondary);
}
.dash-toggle button {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 11.5px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 5px;
}
.dash-toggle button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.dash-toggle .chev {
  width: 10px;
  height: 10px;
  transition: transform 0.15s;
}
.dash-toggle button[aria-expanded='true'] .chev {
  transform: rotate(180deg);
}

.dash-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease;
}
.dash-body.open {
  max-height: 900px;
}

.stats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 2px 8px;
}
.stat-tile {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  flex: 0 0 auto;
  width: 132px;
}
.stat-tile .label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-disabled);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-tile .value {
  font-weight: 700;
  font-size: 19px;
  margin-top: 2px;
}
.stat-tile .value .unit {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-left: 2px;
}
.stat-tile .sub {
  font-size: 9.5px;
  color: var(--color-text-disabled);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-tile {
  width: 210px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  margin-top: 4px;
}
.bar-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.bar-row .cat-label {
  width: 40px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-row .cat-label.wide {
  width: 54px;
}
.bar-track {
  flex: 1;
  height: 6px;
  border-radius: 4px;
  background: var(--color-background);
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  min-width: 2px;
}
.bar-row .cat-val {
  width: 38px;
  text-align: right;
  flex-shrink: 0;
  color: var(--color-text-disabled);
}
.total-row {
  margin-top: 6px;
  border-top: 1px dashed var(--color-border);
  padding-top: 5px;
}
.total-row .cat-label,
.total-row .cat-val {
  font-weight: 600;
  color: var(--color-text-primary);
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.pill {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.pill:hover {
  border-color: var(--color-text-disabled);
}
.pill[aria-pressed='true'].cat-前台 {
  background: var(--cat-前台);
  border-color: var(--cat-前台);
  color: #fff;
}
.pill[aria-pressed='true'].cat-後台 {
  background: var(--cat-後台);
  border-color: var(--cat-後台);
  color: #fff;
}
.pill[aria-pressed='true'].cat-系統 {
  background: var(--cat-系統);
  border-color: var(--cat-系統);
  color: #fff;
}
.pill[aria-pressed='true'].cat-開發管理 {
  background: var(--cat-開發管理);
  border-color: var(--cat-開發管理);
  color: #fff;
}
.pill[aria-pressed='true'].cat-檢定辨識 {
  background: var(--cat-檢定辨識);
  border-color: var(--cat-檢定辨識);
  color: #fff;
}

.filters select,
.filters input[type='search'] {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-size: 12.5px;
  font-family: inherit;
}
.filters input[type='search'] {
  min-width: 200px;
}
.check {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.spacer {
  flex: 1;
}
.count-readout {
  font-size: 11.5px;
  color: var(--color-text-disabled);
}

.upload-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}
.upload-btn,
.template-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.upload-btn {
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}
.upload-btn:hover {
  background: var(--color-primary);
  color: #fff;
}
.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.upload-note {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.upload-panel {
  margin-top: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.upload-panel h3 {
  margin: 0;
  font-size: 13px;
}
.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}
.upload-panel label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: var(--color-text-disabled);
}
.upload-panel input,
.upload-panel select,
.upload-panel textarea {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12.5px;
  font-family: inherit;
}
.upload-panel textarea {
  min-height: 60px;
  resize: vertical;
}
.upload-panel textarea.mono,
.template-text {
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
}
.template-text {
  min-height: 220px;
  width: 100%;
}
.upload-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.upload-status {
  font-size: 11.5px;
}
.upload-status.err {
  color: var(--color-danger);
}
.upload-status.ok {
  color: var(--color-success);
}
.edit-btn {
  margin-left: auto;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.edit-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.src-badge.edited {
  color: var(--color-warning);
  border-color: var(--color-warning);
}
.src-badge.manual {
  color: var(--cat-後台);
  border-color: var(--cat-後台);
}
.edit-btn.danger:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.tombstone {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  opacity: 0.6;
}
.tombstone .topic.strike {
  text-decoration: line-through;
  flex: 1 1 200px;
}
.tombstone-note {
  font-size: 11px;
  color: var(--color-text-disabled);
  white-space: nowrap;
}

main {
  padding: 20px 28px 60px;
  max-width: 980px;
  margin: 0 auto;
}
.day-group {
  margin-top: 6px;
}
.day-heading {
  position: sticky;
  top: var(--header-h, 140px);
  font-weight: 600;
  font-size: 12px;
  color: var(--color-text-disabled);
  padding: 14px 0 8px 26px;
  background: linear-gradient(var(--color-background) 70%, transparent);
  z-index: 5;
}
.entries {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 2px solid var(--color-border);
  margin-left: 6px;
}
.entry {
  position: relative;
  padding: 0 0 14px 26px;
}
.entry::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-text-disabled);
  border: 2px solid var(--color-background);
}
.entry.cat-前台::before {
  background: var(--cat-前台);
}
.entry.cat-後台::before {
  background: var(--cat-後台);
}
.entry.cat-系統::before {
  background: var(--cat-系統);
}
.entry.cat-檢定辨識::before {
  background: var(--cat-檢定辨識);
}
.entry.cat-開發管理::before {
  background: var(--cat-開發管理);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.card > summary {
  list-style: none;
  cursor: pointer;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.card > summary::-webkit-details-marker {
  display: none;
}
.chevron {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--color-text-disabled);
  transition: transform 0.15s;
}
details[open] > summary .chevron {
  transform: rotate(90deg);
}

.time-chip {
  font-size: 11.5px;
  color: var(--color-text-disabled);
  white-space: nowrap;
}
.src-badge {
  font-size: 10px;
  color: var(--color-text-disabled);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 1px 6px;
  white-space: nowrap;
}
.badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.badge.cat-前台 {
  background: var(--cat-前台-bg);
  color: var(--cat-前台);
}
.badge.cat-後台 {
  background: var(--cat-後台-bg);
  color: var(--cat-後台);
}
.badge.cat-系統 {
  background: var(--cat-系統-bg);
  color: var(--cat-系統);
}
.badge.cat-檢定辨識 {
  background: var(--cat-檢定辨識-bg);
  color: var(--cat-檢定辨識);
}
.badge.cat-開發管理 {
  background: var(--cat-開發管理-bg);
  color: var(--cat-開發管理);
}

.tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--color-text-disabled);
  text-transform: uppercase;
}
.tag.feat,
.tag.dev,
.tag.test {
  color: var(--color-success);
}
.tag.fix,
.tag.maint {
  color: var(--color-danger);
}
.tag.design {
  color: var(--cat-後台);
}
.tag.research {
  color: var(--cat-系統);
}

.topic {
  font-weight: 500;
  flex: 1 1 260px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--color-text-secondary);
}
.avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-weight: 700;
  flex-shrink: 0;
}
.dur-chip {
  font-size: 11px;
  color: var(--color-text-disabled);
  white-space: nowrap;
}
.dur-chip.timed {
  color: var(--color-primary);
}

.card-body {
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-disabled);
  font-weight: 600;
}
.summary-text {
  color: var(--color-text-primary);
  white-space: pre-wrap;
}
.prompt-box {
  background: var(--color-background);
  border-left: 3px solid var(--color-primary);
  border-radius: 0 8px 8px 0;
  padding: 8px 12px;
  white-space: pre-wrap;
  font-size: 13px;
}
.prompt-box.empty {
  color: var(--color-text-disabled);
  font-style: italic;
  border-left-color: var(--color-border);
}
.prompt-extra {
  font-size: 11px;
  color: var(--color-text-disabled);
  margin-top: 4px;
}

.result-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  flex-wrap: wrap;
}
.result-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
  flex-shrink: 0;
}
.hash {
  font-family: ui-monospace, monospace;
  color: var(--color-text-secondary);
}
.status-chip {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  color: #fff;
}
.status-chip.st-Done {
  background: var(--status-Done);
}
.status-chip.st-Doing {
  background: var(--status-Doing);
}
.status-chip.st-Ready {
  background: var(--status-Ready);
}
.status-chip.st-Test {
  background: var(--status-Test);
  color: #191100;
}
.status-chip.st-Blocked {
  background: var(--status-Blocked);
}

.files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.file-chip {
  font-family: ui-monospace, monospace;
  font-size: 10.5px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  padding: 2px 7px;
  border-radius: 5px;
}

.diff-details {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
.diff-details > summary {
  list-style: none;
  cursor: pointer;
  padding: 7px 10px;
  background: var(--color-background);
  font-size: 11.5px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, monospace;
}
.diff-details > summary::-webkit-details-marker {
  display: none;
}
.diff-details .chevron {
  width: 12px;
  height: 12px;
}
.diff-scroll {
  overflow-x: auto;
  max-height: 480px;
  overflow-y: auto;
  background: var(--color-surface);
}
.diff {
  margin: 0;
  padding: 10px 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.55;
}
.diff .line {
  display: block;
  padding: 0 12px;
  white-space: pre;
}
.diff .add {
  background: var(--diff-add-bg);
  color: var(--diff-add-fg);
}
.diff .del {
  background: var(--diff-del-bg);
  color: var(--diff-del-fg);
}
.diff .hunk {
  color: var(--diff-hunk);
  font-weight: 600;
}
.diff .meta {
  color: var(--diff-meta);
}
.diff-truncated-note {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--color-text-disabled);
  border-top: 1px dashed var(--color-border);
}
.no-diff-note {
  font-size: 12px;
  color: var(--color-text-disabled);
  font-style: italic;
}
.no-results {
  text-align: center;
  color: var(--color-text-disabled);
  padding: 60px 20px;
  font-size: 13px;
}

.foot {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 28px 40px;
  color: var(--color-text-disabled);
  font-size: 11px;
}

@media (max-width: 640px) {
  .top,
  main,
  .foot {
    padding-left: 14px;
    padding-right: 14px;
  }
}

.fab-stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  z-index: 50;
}
.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 0.12s;
}
.fab:hover {
  transform: scale(1.06);
}
.fab-add {
  background: #297cf2;
}
.fab-csv {
  background: #23a547;
  font-size: 20px;
}

.quick-add-panel {
  position: fixed;
  right: 24px;
  bottom: 96px;
  width: min(420px, calc(100vw - 48px));
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  z-index: 51;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
}
.quick-add-hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-disabled);
}
</style>
