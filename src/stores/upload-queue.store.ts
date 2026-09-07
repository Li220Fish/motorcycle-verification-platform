import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { MAX_RETRY_COUNT, retryDelayFor } from '@/config/imageUpload.config'
import { storageService } from '@/services/firebase/storage.service'
import { verificationService } from '@/services/firebase/verification.service'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { platformService } from '@/services/platform/platform.service'
import type { EvidenceType } from '@/types/verification-evidence'

export type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'uploaded' | 'failed'

export interface UploadQueueEntry {
  /** Same value as the evidence doc's own `id` (verificationStore.addEvidence
   * already generated it) — NOT a separately-invented id, so a queue lookup
   * by an evidence item's id always finds its upload state directly. */
  localId: string
  verificationId: string
  itemId: string
  type: EvidenceType
  /** Fetchable local URI — a blob:/http: URL on web, or a persisted
   * Capacitor Filesystem URI on native (see persistLocally). */
  localUri: string
  extension: string
  uploadStatus: UploadStatus
  retryCount: number
  remoteUrl?: string
  createdAt: number
}

const STORAGE_KEY = 'motoverify:uploadQueue'
/** Evidence types worth running through client-side image compression —
 * everything else (audio/voltage/manual/imu) uploads as-is. */
const COMPRESSIBLE_TYPES: EvidenceType[] = ['photo', 'document']

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

export const useUploadQueueStore = defineStore('upload-queue', () => {
  const entries = ref<Record<string, UploadQueueEntry>>({})
  let hydrated = false
  let hydrationPromise: Promise<void> | null = null

  async function persist(): Promise<void> {
    try {
      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(entries.value) })
    } catch {
      // Best-effort only — an in-memory-only queue still works for this session.
    }
  }

  function setEntry(entry: UploadQueueEntry): void {
    entries.value = { ...entries.value, [entry.localId]: entry }
    void persist()
  }

  /** Copies a freshly-captured file into the app's persistent Data directory
   * (native only) so the queue survives an app restart — the temp/cache path
   * the Camera plugin originally returns is not guaranteed to still exist
   * after the app is closed and reopened. Web has no equivalent durable file
   * store; the in-memory blob URL is used as-is there and won't survive a
   * full page reload (acceptable — this app is mobile-first, web is a
   * dev/preview target). */
  async function persistLocally(localId: string, blob: Blob): Promise<string> {
    if (!platformService.isNative()) {
      return URL.createObjectURL(blob)
    }
    const base64 = await blobToBase64(blob)
    const path = `upload-queue/${localId}.bin`
    const { uri } = await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    })
    return uri
  }

  async function deleteLocalFile(uri: string): Promise<void> {
    if (!platformService.isNative()) {
      URL.revokeObjectURL(uri)
      return
    }
    try {
      await Filesystem.deleteFile({ path: uri })
    } catch {
      // Already gone / not a filesystem path we control — ignore.
    }
  }

  /** Native Filesystem URIs (file://…) aren't directly fetchable from inside
   * the WebView on Android without Capacitor's own URL rewrite. */
  async function readLocalBlob(uri: string): Promise<Blob> {
    const fetchableUri = platformService.isNative() ? Capacitor.convertFileSrc(uri) : uri
    const response = await fetch(fetchableUri)
    return response.blob()
  }

  /** Resumes anything left mid-flight (or never even started) from a
   * previous app session — called once, lazily, before the first enqueue. */
  async function hydrate(): Promise<void> {
    if (hydrated) return
    if (!hydrationPromise) {
      hydrationPromise = (async () => {
        try {
          const { value } = await Preferences.get({ key: STORAGE_KEY })
          if (value) entries.value = JSON.parse(value) as Record<string, UploadQueueEntry>
        } catch {
          // Corrupt/missing — start from an empty queue.
        } finally {
          hydrated = true
        }
        for (const entry of Object.values(entries.value)) {
          if (entry.uploadStatus !== 'uploaded') void processEntry(entry.localId)
        }
      })()
    }
    return hydrationPromise
  }

  /**
   * Enqueues one captured evidence file for background compression + Storage
   * upload. Resolves as soon as the file is safely persisted locally —
   * callers must NOT await the actual upload before advancing the UI.
   */
  async function enqueue(params: {
    localId: string
    verificationId: string
    itemId: string
    type: EvidenceType
    blob: Blob
    extension: string
  }): Promise<void> {
    await hydrate()
    const localUri = await persistLocally(params.localId, params.blob)
    setEntry({
      localId: params.localId,
      verificationId: params.verificationId,
      itemId: params.itemId,
      type: params.type,
      localUri,
      extension: params.extension,
      uploadStatus: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    })
    void processEntry(params.localId)
  }

  async function processEntry(localId: string): Promise<void> {
    const entry = entries.value[localId]
    if (!entry || entry.uploadStatus === 'uploaded') return

    try {
      let blob = await readLocalBlob(entry.localUri)

      if (COMPRESSIBLE_TYPES.includes(entry.type)) {
        setEntry({ ...entry, uploadStatus: 'compressing' })
        blob = (await imageCompressionService.compressImage(blob)).blob
      }

      const beforeUpload = entries.value[localId]
      if (!beforeUpload) return
      setEntry({ ...beforeUpload, uploadStatus: 'uploading' })

      const remoteUrl = await storageService.uploadEvidenceFile(
        entry.verificationId,
        entry.itemId,
        blob,
        entry.extension,
      )
      await verificationService.updateEvidenceRemoteUrl(entry.verificationId, localId, remoteUrl)

      const afterUpload = entries.value[localId]
      if (afterUpload) setEntry({ ...afterUpload, uploadStatus: 'uploaded', remoteUrl })
      void deleteLocalFile(entry.localUri)
    } catch {
      const failedEntry = entries.value[localId]
      if (!failedEntry) return
      const retryCount = failedEntry.retryCount + 1
      setEntry({ ...failedEntry, uploadStatus: 'failed', retryCount })
      if (retryCount <= MAX_RETRY_COUNT) {
        setTimeout(() => void processEntry(localId), retryDelayFor(retryCount - 1))
      }
    }
  }

  /** Manual retry from the UI, after MAX_RETRY_COUNT auto-attempts are exhausted. */
  function retry(localId: string): void {
    const entry = entries.value[localId]
    if (!entry) return
    setEntry({ ...entry, uploadStatus: 'pending', retryCount: 0 })
    void processEntry(localId)
  }

  function statusFor(localId: string): UploadStatus | undefined {
    return entries.value[localId]?.uploadStatus
  }

  function isSettled(localId: string): boolean {
    return entries.value[localId]?.uploadStatus === 'uploaded'
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      for (const entry of Object.values(entries.value)) {
        if (entry.uploadStatus === 'pending' || entry.uploadStatus === 'failed') {
          void processEntry(entry.localId)
        }
      }
    })
  }

  return { entries, hydrate, enqueue, retry, statusFor, isSettled }
})
