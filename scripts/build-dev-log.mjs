#!/usr/bin/env node
// Mines git history + local Claude Code session transcripts (~/.claude/projects/<this-project>/*.jsonl)
// into a structured development log: one entry per commit, enriched with the user prompt(s)
// that led to it, the diff (collapsible in the viewer), and a rough time-spent estimate.
//
// Output: src/data/dev-log.json (bundled into the /dev-log page at build time).
// For live per-commit sync from a collaborator's own machine between rebuilds,
// see scripts/sync-devlog.mjs — it shares the git/session mining logic here
// (scripts/lib/devlog-git.mjs) but pushes straight to Firestore instead.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  REPO_ROOT,
  fetchAllBranches,
  gitLog,
  loadSessionMessages,
  buildEntries,
} from './lib/devlog-git.mjs'

const OUT_FILE = path.join(REPO_ROOT, 'src', 'data', 'dev-log.json')

// ---------- manual work-log entries (hand-transcribed from MotoVerify-開發工作記錄.md) ----------

function loadManualLogEntries() {
  const raw = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'scripts', 'data', 'manual-log-entries.json'), 'utf8'),
  )
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
  }))
}

// ---------- team planning sheet entries (transcribed from 團隊規劃表 - 需求表.pdf) ----------

function loadTeamSheetData() {
  const raw = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'scripts', 'data', 'team-sheet-entries.json'), 'utf8'),
  )
  const toIso = (d) => (d ? `${d}T12:00:00+08:00` : null)
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
  }))
  return { entries, teamSummary: raw.teamSummary }
}

// ---------- main ----------

fetchAllBranches()
const commits = gitLog()
const { userTurns, imageOnlyTurns } = loadSessionMessages()
const gitEntries = buildEntries(commits, userTurns, imageOnlyTurns)
const manualLogEntries = loadManualLogEntries()
const { entries: teamSheetEntries, teamSummary } = loadTeamSheetData()

const entries = [...gitEntries, ...manualLogEntries, ...teamSheetEntries]

const withDuration = entries.filter((e) => e.durationMs !== null)
const totalDurationMs = withDuration.reduce((sum, e) => sum + e.durationMs, 0)
const withPrompt = entries.filter((e) => e.prompt)

const byUserLaborHours = teamSheetEntries.reduce((acc, e) => {
  if (e.laborHours != null) acc[e.user] = (acc[e.user] || 0) + e.laborHours
  return acc
}, {})

const summary = {
  generatedAt: new Date().toISOString(),
  totalEntries: entries.length,
  entriesWithTimedPrompt: withPrompt.length,
  totalTimedDurationMs: totalDurationMs,
  bySource: entries.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1
    return acc
  }, {}),
  byCategory: entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1
    return acc
  }, {}),
  byUser: entries.reduce((acc, e) => {
    acc[e.user] = (acc[e.user] || 0) + 1
    return acc
  }, {}),
  timedDurationByCategory: withDuration.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.durationMs
    return acc
  }, {}),
  byUserLaborHours,
}

writeFileSync(OUT_FILE, JSON.stringify({ summary, teamSummary, entries }, null, 2))
console.log(`Wrote ${entries.length} entries to ${path.relative(REPO_ROOT, OUT_FILE)}`)
console.log(
  `  git: ${gitEntries.length}, manual-log: ${manualLogEntries.length}, team-sheet: ${teamSheetEntries.length}`,
)
console.log(`Entries with a captured prompt: ${withPrompt.length}`)
console.log(
  `Blended quantified time across all sources: ${(totalDurationMs / 3600000).toFixed(1)}h`,
)
