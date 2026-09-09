// Shared git-history + local Claude Code session-transcript mining, used by
// both scripts/build-dev-log.mjs (full static rebuild, run by anyone, bundled
// into the app) and scripts/sync-devlog.mjs (each collaborator's own machine,
// pushes just their own newly-prompted commits straight to Firestore).
//
// Keeping this in one place means both scripts categorize/clean/match commits
// identically — a fix here (like the <ide_selection> stripping) benefits both.

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

export const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim()
export const PROJECT_SLUG = REPO_ROOT.replace(/\//g, '-') // Claude Code's on-disk project key
export const SESSIONS_DIR = path.join(homedir(), '.claude', 'projects', PROJECT_SLUG)

export const MAX_PROMPT_CHARS = 4000
export const MAX_DIFF_CHARS = 20000
export const SESSION_GAP_MS = 3 * 60 * 60 * 1000 // >3h idle before a commit => don't attribute that gap as "work time"

// ---------- git commits ----------

export function fetchAllBranches() {
  try {
    execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' })
  } catch (err) {
    console.warn('git fetch --all failed (offline?) — using local history only:', err.message)
  }
}

// Same humans, different git identities used across machines/commits —
// collapse to one canonical display name so per-user stats aren't split.
const USER_ALIASES = {
  'LI,TZU-CHIEH': 'li220fish',
  AN4114760: 'Archi',
}
export function canonicalUser(name) {
  return USER_ALIASES[name] || name
}

export function gitLog() {
  const sep = '\x1f'
  const rowSep = '\x1e'
  const raw = execSync(
    `git log --all --date=iso-strict --pretty=format:"%H${sep}%ad${sep}%an${sep}%ae${sep}%s${sep}%b${rowSep}"`,
    { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 },
  ).toString()
  return raw
    .split(rowSep)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((row) => {
      const [hash, date, author, email, subject, body] = row.split(sep)
      return {
        hash,
        date,
        author: canonicalUser(author),
        email,
        subject,
        body: (body || '').trim(),
      }
    })
    .reverse() // chronological
}

export function gitShowStat(hash) {
  return execSync(`git show --stat --format="" ${hash}`, {
    cwd: REPO_ROOT,
    maxBuffer: 1024 * 1024 * 64,
  })
    .toString()
    .trim()
}

export function gitDiff(hash) {
  let diff = execSync(`git show --format="" ${hash}`, {
    cwd: REPO_ROOT,
    maxBuffer: 1024 * 1024 * 256,
  }).toString()
  let truncated = false
  if (diff.length > MAX_DIFF_CHARS) {
    diff = diff.slice(0, MAX_DIFF_CHARS)
    truncated = true
  }
  return { diff, truncated }
}

export function changedFiles(hash) {
  return execSync(`git show --name-only --format="" ${hash}`, {
    cwd: REPO_ROOT,
    maxBuffer: 1024 * 1024 * 64,
  })
    .toString()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ---------- commit type + cleaned topic ----------

export function classifyType(subject) {
  const m = subject.match(/^(feat|fix|refactor|chore|docs|style|test|perf)(\([^)]*\))?:/i)
  if (m) return m[1].toLowerCase()
  if (/^merge/i.test(subject)) return 'merge'
  return 'other'
}

export function cleanTopic(subject) {
  return (
    subject
      .replace(/^(feat|fix|refactor|chore|docs|style|test|perf)(\([^)]*\))?:\s*/i, '')
      .trim() || subject
  )
}

export function cleanBody(body) {
  if (!body) return null
  const cleaned = body
    .split('\n')
    .filter(
      (line) => !/^Co-Authored-By:/i.test(line.trim()) && !/^🤖 Generated with/i.test(line.trim()),
    )
    .join('\n')
    .trim()
  return cleaned || null
}

// ---------- categorization ----------

export function categorize(files) {
  const hits = { 後台: 0, 檢定辨識: 0, 系統: 0, 前台: 0, 開發管理: 0 }
  for (const f of files) {
    // this dev-log dashboard's own source/data — distinct from the ride騎吧
    // app's own 系統 work, so it doesn't drown out real infra commits there.
    if (/dev-?log/i.test(f)) hits['開發管理']++
    else if (/^src\/admin\//.test(f)) hits['後台']++
    else if (
      /src\/(services\/(verification|recognition|analysis|motion|bluetooth)|components\/(verification|probe))\//.test(
        f,
      ) ||
      /src\/views\/.*[Vv]erif/.test(f)
    )
      hits['檢定辨識']++
    else if (
      /^(functions|scripts|ios|android|storage\.rules|firestore\.rules|firebase\.json|vite\.config|package\.json|\.github)/.test(
        f,
      ) ||
      /src\/(services\/firebase|config)\//.test(f)
    )
      hits['系統']++
    else if (/^src\//.test(f)) hits['前台']++
  }
  const best = Object.entries(hits).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best[0] : '系統'
}

// ---------- Claude Code session transcripts ----------

function extractText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n')
    .trim()
}

function hasNonTextBlocks(content) {
  return (
    Array.isArray(content) &&
    content.some((c) => c && (c.type === 'image' || c.type === 'tool_result'))
  )
}

export function loadSessionMessages() {
  let files
  try {
    files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.jsonl'))
  } catch {
    return { userTurns: [], imageOnlyTurns: [], edits: [] }
  }

  const userTurns = [] // { ts, text, sessionId }
  const imageOnlyTurns = [] // { ts, sessionId } - screenshot/image feedback with no text
  const edits = [] // { ts, tool, file, sessionId }

  for (const file of files) {
    const full = path.join(SESSIONS_DIR, file)
    let lines
    try {
      lines = readFileSync(full, 'utf8').split('\n')
    } catch {
      continue
    }
    for (const line of lines) {
      if (!line.trim()) continue
      let obj
      try {
        obj = JSON.parse(line)
      } catch {
        continue
      }
      const ts = obj.timestamp
      if (obj.type === 'user' && obj.message && obj.message.role === 'user' && ts) {
        const content = obj.message.content
        const rawText = extractText(content)
        const isImageCaptionOnly = /^\[Image: .*\]$/s.test(rawText.trim())
        if (hasNonTextBlocks(content) || isImageCaptionOnly) {
          // no usable text, but still a real user turn (e.g. pasted screenshot) - keep for duration fallback
          if (
            !extractText(content)
              .replace(/^\[Image: .*\]$/s, '')
              .trim()
          ) {
            imageOnlyTurns.push({ ts: Date.parse(ts), sessionId: obj.sessionId || file })
          }
          continue
        }
        // Strip IDE-injected context blocks (selection snippets, system reminders) —
        // they're harness noise around the message, not part of what the user typed.
        const text = rawText
          .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/g, '')
          .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
          .trim()
        if (text && !text.startsWith('<system-reminder') && !/^<command-name>/.test(text)) {
          userTurns.push({ ts: Date.parse(ts), text, sessionId: obj.sessionId || file })
        }
      }
      if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content) && ts) {
        for (const block of obj.message.content) {
          if (block.type === 'tool_use' && ['Edit', 'Write', 'MultiEdit'].includes(block.name)) {
            const fp = block.input && (block.input.file_path || block.input.path)
            if (fp)
              edits.push({
                ts: Date.parse(ts),
                tool: block.name,
                file: fp,
                sessionId: obj.sessionId || file,
              })
          }
        }
      }
    }
  }
  userTurns.sort((a, b) => a.ts - b.ts)
  imageOnlyTurns.sort((a, b) => a.ts - b.ts)
  edits.sort((a, b) => a.ts - b.ts)
  return { userTurns, imageOnlyTurns, edits }
}

// ---------- stitch commits + prompts ----------

export function buildEntries(commits, userTurns, imageOnlyTurns) {
  const entries = []
  let prevCommitTs = null

  for (const c of commits) {
    const commitTs = Date.parse(c.date)
    const windowStart = prevCommitTs !== null ? prevCommitTs : commitTs - SESSION_GAP_MS

    const promptsInWindow = userTurns.filter(
      (u) => u.ts > windowStart && u.ts <= commitTs && u.text.length > 3,
    )

    let promptText = null
    let promptTs = null
    let extraPromptCount = 0
    if (promptsInWindow.length) {
      // pick the first substantial (non-trivial ack) prompt in the window as "the" request
      const substantial = promptsInWindow.find((p) => p.text.length > 15) || promptsInWindow[0]
      promptText = substantial.text.slice(0, MAX_PROMPT_CHARS)
      promptTs = substantial.ts
      extraPromptCount = promptsInWindow.length - 1
    } else {
      const imagesInWindow = imageOnlyTurns.filter((u) => u.ts > windowStart && u.ts <= commitTs)
      if (imagesInWindow.length) {
        promptText = '（使用者傳送畫面截圖回報問題，未附加文字說明）'
        promptTs = imagesInWindow[0].ts
      }
    }

    let durationMs = null
    if (promptTs !== null) {
      durationMs = Math.max(0, commitTs - promptTs)
      if (durationMs > SESSION_GAP_MS) durationMs = null // idle gap, not real work time
    }

    const files = changedFiles(c.hash)
    const category = categorize(files)
    const stat = gitShowStat(c.hash)
    const { diff, truncated } = gitDiff(c.hash)

    entries.push({
      id: c.hash,
      source: 'git',
      hash: c.hash,
      shortHash: c.hash.slice(0, 7),
      user: c.author,
      email: c.email,
      timestamp: c.date,
      endTimestamp: null,
      timePrecision: 'minute',
      type: classifyType(c.subject),
      topic: cleanTopic(c.subject),
      category,
      summary: cleanBody(c.body),
      prompt: promptText,
      promptExtraCount: extraPromptCount,
      files,
      stat,
      diff,
      diffTruncated: truncated,
      result: `已提交 commit ${c.hash.slice(0, 7)}`,
      durationMs,
      laborHours: null,
      priority: null,
      status: null,
    })

    prevCommitTs = commitTs
  }
  return entries
}
