/**
 * Sequential background uploader over pending-store.ts. One upload at a
 * time keeps a weak cellular link from thrashing between several large
 * JPEGs; the viewfinder never waits on it.
 */
import { computed, reactive } from 'vue'

import { uploadCapture } from './capture.service'
import { pendingStore, type PendingCapture } from './pending-store'

export interface QueueEntry {
  id: string
  sessionId: string
  shotId: string
  thumbUrl: string
  state: 'queued' | 'uploading' | 'error'
  progress: number
  error: string | null
}

const state = reactive<{ entries: QueueEntry[] }>({ entries: [] })
const blobs = new Map<string, PendingCapture>()
const listeners = new Set<(entry: QueueEntry) => void>()
let running = false

function addEntry(item: PendingCapture): void {
  if (blobs.has(item.id)) return
  blobs.set(item.id, item)
  state.entries.push({
    id: item.id,
    sessionId: item.doc.sessionId,
    shotId: item.doc.shotId,
    thumbUrl: URL.createObjectURL(item.blob),
    state: 'queued',
    progress: 0,
    error: null,
  })
}

async function drain(): Promise<void> {
  if (running) return
  running = true
  try {
    for (;;) {
      const entry = state.entries.find((e) => e.state === 'queued')
      if (!entry) break
      const item = blobs.get(entry.id)!
      entry.state = 'uploading'
      entry.progress = 0
      try {
        await uploadCapture(item, (f) => (entry.progress = f))
        await pendingStore.remove(entry.id)
        blobs.delete(entry.id)
        state.entries.splice(state.entries.indexOf(entry), 1)
        listeners.forEach((fn) => fn(entry))
        URL.revokeObjectURL(entry.thumbUrl)
      } catch (error) {
        entry.state = 'error'
        entry.error = error instanceof Error ? error.message : '上傳失敗'
      }
    }
  } finally {
    running = false
  }
}

export const uploadQueue = {
  entries: computed(() => state.entries),
  activeCount: computed(() => state.entries.length),
  errorCount: computed(() => state.entries.filter((e) => e.state === 'error').length),

  async enqueue(item: PendingCapture): Promise<void> {
    await pendingStore.put(item)
    addEntry(item)
    void drain()
  },

  /** Reloads anything left over from a previous visit for this account. */
  async resume(uid: string): Promise<void> {
    const leftovers = await pendingStore.all()
    leftovers.filter((i) => i.doc.collectorUid === uid).forEach(addEntry)
    void drain()
  },

  retryFailed(): void {
    state.entries.forEach((e) => {
      if (e.state === 'error') {
        e.state = 'queued'
        e.error = null
      }
    })
    void drain()
  },

  /** Called after each successful upload (doc now exists in Firestore). */
  onUploaded(fn: (entry: QueueEntry) => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

window.addEventListener('online', () => uploadQueue.retryFailed())
