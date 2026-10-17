import { ref } from 'vue'
import type { VehicleModelKnownIssue } from '@/services/firebase/vehicle-model.service'

/**
 * Drives a one-shot-per-key 通病提醒彈窗 — the first time the buyer reaches
 * an item with a matching known issue (see known-issue-mapping.ts), show it
 * once; never again for that same key within this component's lifetime.
 * Purely informational — closing it never blocks answering the item.
 */
export function useKnownIssueReminder() {
  const shownKeys = new Set<string>()
  const open = ref(false)
  const activeIssues = ref<VehicleModelKnownIssue[]>([])

  function maybeShow(key: string, issues: VehicleModelKnownIssue[]): void {
    if (issues.length === 0 || shownKeys.has(key)) return
    shownKeys.add(key)
    activeIssues.value = issues
    open.value = true
  }

  function close(): void {
    open.value = false
  }

  return { open, activeIssues, maybeShow, close }
}
