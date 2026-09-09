#!/usr/bin/env node
// Pushes this machine's own newly-prompted commits straight to Firestore, so
// they show up on /dev-log immediately instead of waiting for someone to
// rerun build-dev-log.mjs and redeploy. Meant to be run by every
// collaborator on their own machine (`npm run sync:devlog`), any time after
// committing — it's safe to run repeatedly (each commit gets a deterministic
// doc id, so re-syncing just overwrites the same doc).
//
// Only commits where a local Claude Code prompt was actually matched get
// synced — a commit this machine has no prompt for adds nothing the static
// bundle doesn't already show, and skipping it means one collaborator's sync
// run can never blow away a better entry another machine already produced.
//
// A commit someone deleted from the timeline (see devlog_deletions in the
// app) is intentionally never re-synced — the tombstone wins until someone
// restores it from the UI.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

import {
  REPO_ROOT,
  fetchAllBranches,
  gitLog,
  loadSessionMessages,
  buildEntries,
} from './lib/devlog-git.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const result = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return result
}

const env = { ...loadEnvFile(path.join(REPO_ROOT, '.env')), ...process.env }

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.projectId) {
  console.error(
    '[sync-devlog] Missing Firebase config — copy .env.example to .env and fill it in first.',
  )
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

fetchAllBranches()
const commits = gitLog()
const { userTurns, imageOnlyTurns } = loadSessionMessages()
const entries = buildEntries(commits, userTurns, imageOnlyTurns).filter((e) => e.prompt)

console.log(
  `[sync-devlog] ${entries.length} local commit(s) have a matched prompt on this machine.`,
)

let synced = 0
let skippedDeleted = 0

for (const e of entries) {
  const docId = `git-${e.hash}`

  const tombstone = await getDoc(doc(db, 'devlog_deletions', e.id))
  if (tombstone.exists()) {
    skippedDeleted++
    continue
  }

  const payload = {
    topic: e.topic,
    user: e.user,
    timestamp: e.timestamp,
    category: e.category,
    type: e.type,
    summary: e.summary,
    prompt: e.prompt,
    diff: e.diff,
    result: e.result,
    durationHours: e.durationMs != null ? e.durationMs / 3600000 : null,
    rawMarkdown: '',
    gitHash: e.hash,
    shortHash: e.shortHash,
    files: e.files,
    submittedAt: new Date().toISOString(),
  }

  if (dryRun) {
    console.log(`  [dry-run] would sync ${e.shortHash} — ${e.topic}`)
  } else {
    await setDoc(doc(db, 'devlog_submissions', docId), payload)
    console.log(`  synced ${e.shortHash} — ${e.topic}`)
  }
  synced++
}

console.log(
  `[sync-devlog] ${dryRun ? 'would sync' : 'synced'} ${synced} commit(s)` +
    (skippedDeleted ? `, skipped ${skippedDeleted} previously-deleted from the timeline` : '') +
    '.',
)
