#!/usr/bin/env node
// Mines git history + local Claude Code session transcripts (~/.claude/projects/<this-project>/*.jsonl)
// into a structured development log: one entry per commit, enriched with the user prompt(s)
// that led to it, the diff (collapsible in the viewer), and a rough time-spent estimate.
//
// Output: scripts/data/dev-log.json  (consumed by the dev-log Artifact dashboard)

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const PROJECT_SLUG = REPO_ROOT.replace(/\//g, '-'); // Claude Code's on-disk project key
const SESSIONS_DIR = path.join(homedir(), '.claude', 'projects', PROJECT_SLUG);
const OUT_FILE = path.join(REPO_ROOT, 'src', 'data', 'dev-log.json');

const MAX_PROMPT_CHARS = 4000;
const MAX_DIFF_CHARS = 20000;
const SESSION_GAP_MS = 3 * 60 * 60 * 1000; // >3h idle before a commit => don't attribute that gap as "work time"

// ---------- 1. git commits ----------

// Pull every collaborator's branches from GitHub before reading history —
// commits pushed to develop/feature branches but never merged into the
// branch checked out locally would otherwise be invisible to `git log`.
try {
  execSync('git fetch --all --prune', { cwd: REPO_ROOT, stdio: 'pipe' });
} catch (err) {
  console.warn('git fetch --all failed (offline?) — using local history only:', err.message);
}

// Same humans, different git identities used across machines/commits —
// collapse to one canonical display name so per-user stats aren't split.
const USER_ALIASES = {
  'LI,TZU-CHIEH': 'li220fish',
  AN4114760: 'Archi',
};
function canonicalUser(name) {
  return USER_ALIASES[name] || name;
}

function gitLog() {
  const sep = '\x1f';
  const rowSep = '\x1e';
  const raw = execSync(
    `git log --all --date=iso-strict --pretty=format:"%H${sep}%ad${sep}%an${sep}%ae${sep}%s${sep}%b${rowSep}"`,
    { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 }
  ).toString();
  return raw
    .split(rowSep)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((row) => {
      const [hash, date, author, email, subject, body] = row.split(sep);
      return { hash, date, author: canonicalUser(author), email, subject, body: (body || '').trim() };
    })
    .reverse(); // chronological
}

function gitShowStat(hash) {
  return execSync(`git show --stat --format="" ${hash}`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 })
    .toString()
    .trim();
}

function gitDiff(hash) {
  let diff = execSync(`git show --format="" ${hash}`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 256 }).toString();
  let truncated = false;
  if (diff.length > MAX_DIFF_CHARS) {
    diff = diff.slice(0, MAX_DIFF_CHARS);
    truncated = true;
  }
  return { diff, truncated };
}

function changedFiles(hash) {
  return execSync(`git show --name-only --format="" ${hash}`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 64 })
    .toString()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- 1b. commit type + cleaned topic ----------

function classifyType(subject) {
  const m = subject.match(/^(feat|fix|refactor|chore|docs|style|test|perf)(\([^)]*\))?:/i);
  if (m) return m[1].toLowerCase();
  if (/^merge/i.test(subject)) return 'merge';
  return 'other';
}

function cleanTopic(subject) {
  return subject.replace(/^(feat|fix|refactor|chore|docs|style|test|perf)(\([^)]*\))?:\s*/i, '').trim() || subject;
}

function cleanBody(body) {
  if (!body) return null;
  const cleaned = body
    .split('\n')
    .filter((line) => !/^Co-Authored-By:/i.test(line.trim()) && !/^🤖 Generated with/i.test(line.trim()))
    .join('\n')
    .trim();
  return cleaned || null;
}

// ---------- 2. categorization ----------

function categorize(files) {
  const hits = { 後台: 0, 檢定辨識: 0, 系統: 0, 前台: 0 };
  for (const f of files) {
    if (/^src\/admin\//.test(f)) hits['後台']++;
    else if (
      /src\/(services\/(verification|recognition|analysis|motion|bluetooth)|components\/(verification|probe))\//.test(f) ||
      /src\/views\/.*[Vv]erif/.test(f)
    )
      hits['檢定辨識']++;
    else if (
      /^(functions|scripts|ios|android|storage\.rules|firestore\.rules|firebase\.json|vite\.config|package\.json|\.github)/.test(f) ||
      /src\/(services\/firebase|config)\//.test(f)
    )
      hits['系統']++;
    else if (/^src\//.test(f)) hits['前台']++;
  }
  const best = Object.entries(hits).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : '系統';
}

// ---------- 3. Claude Code session transcripts ----------

function extractText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n')
    .trim();
}

function hasNonTextBlocks(content) {
  return Array.isArray(content) && content.some((c) => c && (c.type === 'image' || c.type === 'tool_result'));
}

function loadSessionMessages() {
  let files = [];
  try {
    files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return { userTurns: [], edits: [] };
  }

  const userTurns = []; // { ts, text, sessionId }
  const imageOnlyTurns = []; // { ts, sessionId } - screenshot/image feedback with no text
  const edits = []; // { ts, tool, file, sessionId }

  for (const file of files) {
    const full = path.join(SESSIONS_DIR, file);
    let lines;
    try {
      lines = readFileSync(full, 'utf8').split('\n');
    } catch {
      continue;
    }
    for (const line of lines) {
      if (!line.trim()) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = obj.timestamp;
      if (obj.type === 'user' && obj.message && obj.message.role === 'user' && ts) {
        const content = obj.message.content;
        const rawText = extractText(content);
        const isImageCaptionOnly = /^\[Image: .*\]$/s.test(rawText.trim());
        if (hasNonTextBlocks(content) || isImageCaptionOnly) {
          // no usable text, but still a real user turn (e.g. pasted screenshot) - keep for duration fallback
          if (!extractText(content).replace(/^\[Image: .*\]$/s, '').trim()) {
            imageOnlyTurns.push({ ts: Date.parse(ts), sessionId: obj.sessionId || file });
          }
          continue;
        }
        // Strip IDE-injected context blocks (selection snippets, system reminders) —
        // they're harness noise around the message, not part of what the user typed.
        const text = rawText
          .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/g, '')
          .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
          .trim();
        if (text && !text.startsWith('<system-reminder') && !/^<command-name>/.test(text)) {
          userTurns.push({ ts: Date.parse(ts), text, sessionId: obj.sessionId || file });
        }
      }
      if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content) && ts) {
        for (const block of obj.message.content) {
          if (block.type === 'tool_use' && ['Edit', 'Write', 'MultiEdit'].includes(block.name)) {
            const fp = block.input && (block.input.file_path || block.input.path);
            if (fp) edits.push({ ts: Date.parse(ts), tool: block.name, file: fp, sessionId: obj.sessionId || file });
          }
        }
      }
    }
  }
  userTurns.sort((a, b) => a.ts - b.ts);
  imageOnlyTurns.sort((a, b) => a.ts - b.ts);
  edits.sort((a, b) => a.ts - b.ts);
  return { userTurns, imageOnlyTurns, edits };
}

// ---------- 4. stitch commits + prompts ----------

function buildEntries(commits, userTurns, imageOnlyTurns) {
  const entries = [];
  let prevCommitTs = null;

  for (const c of commits) {
    const commitTs = Date.parse(c.date);
    const windowStart = prevCommitTs !== null ? prevCommitTs : commitTs - SESSION_GAP_MS;

    const promptsInWindow = userTurns.filter((u) => u.ts > windowStart && u.ts <= commitTs && u.text.length > 3);

    let promptText = null;
    let promptTs = null;
    let extraPromptCount = 0;
    if (promptsInWindow.length) {
      // pick the first substantial (non-trivial ack) prompt in the window as "the" request
      const substantial = promptsInWindow.find((p) => p.text.length > 15) || promptsInWindow[0];
      promptText = substantial.text.slice(0, MAX_PROMPT_CHARS);
      promptTs = substantial.ts;
      extraPromptCount = promptsInWindow.length - 1;
    } else {
      const imagesInWindow = imageOnlyTurns.filter((u) => u.ts > windowStart && u.ts <= commitTs);
      if (imagesInWindow.length) {
        promptText = '（使用者傳送畫面截圖回報問題，未附加文字說明）';
        promptTs = imagesInWindow[0].ts;
      }
    }

    let durationMs = null;
    if (promptTs !== null) {
      durationMs = Math.max(0, commitTs - promptTs);
      if (durationMs > SESSION_GAP_MS) durationMs = null; // idle gap, not real work time
    }

    const files = changedFiles(c.hash);
    const category = categorize(files);
    const stat = gitShowStat(c.hash);
    const { diff, truncated } = gitDiff(c.hash);

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
    });

    prevCommitTs = commitTs;
  }
  return entries;
}

// ---------- 5. manual work-log entries (hand-transcribed from MotoVerify-開發工作記錄.md) ----------

function loadManualLogEntries() {
  const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, 'scripts', 'data', 'manual-log-entries.json'), 'utf8'));
  return raw.map((e) => ({
    id: e.id,
    source: 'manual-log',
    hash: null,
    shortHash: null,
    user: e.user,
    email: null,
    timestamp: e.timestamp,
    endTimestamp: e.endTimestamp,
    timePrecision: e.timePrecision,
    type: e.type,
    topic: e.topic,
    category: e.category,
    summary: e.summary,
    prompt: e.prompt,
    promptExtraCount: 0,
    files: [],
    stat: e.stat,
    diff: e.diff,
    diffTruncated: false,
    result: e.result,
    durationMs: e.durationHours != null ? e.durationHours * 3600000 : null,
    laborHours: null,
    priority: null,
    status: null,
    estimateHoursText: e.estimateHoursText || null,
  }));
}

// ---------- 6. team planning sheet entries (transcribed from 團隊規劃表 - 需求表.pdf) ----------

function loadTeamSheetData() {
  const raw = JSON.parse(readFileSync(path.join(REPO_ROOT, 'scripts', 'data', 'team-sheet-entries.json'), 'utf8'));
  const toIso = (d) => (d ? `${d}T12:00:00+08:00` : null);
  const entries = raw.entries.map((e) => ({
    id: e.id,
    source: 'team-sheet',
    hash: null,
    shortHash: null,
    user: e.user,
    email: null,
    timestamp: toIso(e.start),
    endTimestamp: toIso(e.end),
    timePrecision: 'day',
    type: e.type,
    topic: e.topic,
    category: e.category,
    summary: e.summary,
    prompt: null,
    promptExtraCount: 0,
    files: [],
    stat: null,
    diff: null,
    diffTruncated: false,
    result: `${raw.statusResult[e.status] || e.status}${e.end ? `（結案：${e.end}）` : ''}`,
    durationMs: e.hours != null ? e.hours * 3600000 : null,
    laborHours: e.hours,
    priority: e.priority,
    status: e.status,
  }));
  return { entries, teamSummary: raw.teamSummary };
}

// ---------- main ----------

const commits = gitLog();
const { userTurns, imageOnlyTurns } = loadSessionMessages();
const gitEntries = buildEntries(commits, userTurns, imageOnlyTurns);
const manualLogEntries = loadManualLogEntries();
const { entries: teamSheetEntries, teamSummary } = loadTeamSheetData();

const entries = [...gitEntries, ...manualLogEntries, ...teamSheetEntries];

const withDuration = entries.filter((e) => e.durationMs !== null);
const totalDurationMs = withDuration.reduce((sum, e) => sum + e.durationMs, 0);
const withPrompt = entries.filter((e) => e.prompt);

const byUserLaborHours = teamSheetEntries.reduce((acc, e) => {
  if (e.laborHours != null) acc[e.user] = (acc[e.user] || 0) + e.laborHours;
  return acc;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  totalEntries: entries.length,
  entriesWithTimedPrompt: withPrompt.length,
  totalTimedDurationMs: totalDurationMs,
  bySource: entries.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {}),
  byCategory: entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {}),
  byUser: entries.reduce((acc, e) => {
    acc[e.user] = (acc[e.user] || 0) + 1;
    return acc;
  }, {}),
  timedDurationByCategory: withDuration.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.durationMs;
    return acc;
  }, {}),
  byUserLaborHours,
};

writeFileSync(OUT_FILE, JSON.stringify({ summary, teamSummary, entries }, null, 2));
console.log(`Wrote ${entries.length} entries to ${path.relative(REPO_ROOT, OUT_FILE)}`);
console.log(
  `  git: ${gitEntries.length}, manual-log: ${manualLogEntries.length}, team-sheet: ${teamSheetEntries.length}`
);
console.log(`Entries with a captured prompt: ${withPrompt.length}`);
console.log(`Blended quantified time across all sources: ${(totalDurationMs / 3600000).toFixed(1)}h`);
