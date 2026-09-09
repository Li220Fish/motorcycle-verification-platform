export type DevLogCategory = '前台' | '後台' | '系統' | '檢定辨識'
export type DevLogSource = 'git' | 'manual-log' | 'team-sheet' | 'submission'

export interface DevLogEntry {
  id: string
  source: DevLogSource
  hash: string | null
  shortHash: string | null
  user: string
  email: string | null
  timestamp: string | null
  endTimestamp: string | null
  timePrecision: 'minute' | 'day'
  type: string
  topic: string
  category: DevLogCategory
  summary: string | null
  prompt: string | null
  promptExtraCount: number
  files: string[]
  stat: string | null
  diff: string | null
  diffTruncated: boolean
  result: string
  durationMs: number | null
  laborHours: number | null
  priority: string | null
  status: string | null
  edited?: boolean
}

export interface DevLogSummary {
  generatedAt: string
  totalEntries: number
  entriesWithTimedPrompt: number
  totalTimedDurationMs: number
  bySource: Record<string, number>
  byCategory: Record<string, number>
  byUser: Record<string, number>
  timedDurationByCategory: Record<string, number>
  byUserLaborHours: Record<string, number>
}

export interface DevLogTeamSummary {
  estimatedHours: number
  actualHours: number
  completionRate: number
  byType: Record<string, number>
  sourceFile: string
}

export interface DevLogData {
  summary: DevLogSummary
  teamSummary: DevLogTeamSummary
  entries: DevLogEntry[]
}

export interface CountdownState {
  purpose: string
  targetIso: string
  updatedBy?: string
  updatedAt: string
}

export interface DevLogSubmissionInput {
  topic: string
  user: string
  timestamp: string | null
  category: DevLogCategory
  type: string
  summary: string | null
  prompt: string | null
  diff: string | null
  result: string | null
  durationHours: number | null
  rawMarkdown: string
}

export interface DevLogSubmissionDoc extends DevLogSubmissionInput {
  submittedAt: string
}

/** A correction/patch applied on top of a base entry (git/manual-log/
 * team-sheet/submission) — keyed by that entry's `id` in devlog_overrides.
 * Only the fields someone actually edited are present; `undefined` means
 * "leave the base value alone" (distinct from `null`, which clears it). */
export interface DevLogOverride {
  topic?: string
  user?: string
  timestamp?: string | null
  category?: DevLogCategory
  type?: string
  summary?: string | null
  prompt?: string | null
  diff?: string | null
  result?: string | null
  hours?: number | null
  updatedBy: string
  updatedAt: string
}
