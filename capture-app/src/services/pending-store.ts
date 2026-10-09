/**
 * IndexedDB holding area for photos taken but not yet uploaded. Collection
 * happens in parking lots with patchy signal — a shot is written here BEFORE
 * any network call and only removed once both the Storage upload and the
 * Firestore doc have succeeded, so closing the tab or losing signal never
 * loses a photo (the queue resumes them on next launch).
 */
import type { TrainingCapture } from '@/data/training/training-dataset.types'

/** Everything needed to write the trainingCaptures doc, minus server fields. */
export type PendingCaptureDoc = Omit<TrainingCapture, 'id' | 'reviewedAt' | 'capturedAt'> & {
  capturedAtMs: number
}

export interface PendingCapture {
  id: string
  blob: Blob
  doc: PendingCaptureDoc
}

const DB_NAME = 'ride-capture'
const STORE = 'pending'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const pendingStore = {
  put: (item: PendingCapture) => run('readwrite', (s) => s.put(item)).then(() => undefined),
  remove: (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined),
  all: () => run<PendingCapture[]>('readonly', (s) => s.getAll() as IDBRequest<PendingCapture[]>),
}
