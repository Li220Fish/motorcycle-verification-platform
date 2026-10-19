/** In-memory stand-in for `firebase/storage`. */
interface StoredObject {
  data: unknown
  metadata?: Record<string, unknown>
}

const objects = new Map<string, StoredObject>()
let failNext: { fn: string; error: unknown } | null = null

function maybeFail(fn: string): void {
  if (failNext && failNext.fn === fn) {
    const { error } = failNext
    failNext = null
    throw error
  }
}

export class StorageReference {
  constructor(public readonly fullPath: string) {}
  get name(): string {
    return this.fullPath.split('/').pop()!
  }
  get bucket(): string {
    return 'fake-bucket'
  }
  toString(): string {
    return `gs://fake-bucket/${this.fullPath}`
  }
}

export const getStorage = () => ({ type: 'storage-stub' })
export const connectStorageEmulator = () => {}

export function ref(_storage: unknown, path = ''): StorageReference {
  if (/^gs:\/\//.test(path)) path = path.replace(/^gs:\/\/[^/]+\//, '')
  if (/^https?:\/\//.test(path)) {
    const match = /\/o\/([^?]+)/.exec(path)
    path = match ? decodeURIComponent(match[1]) : path
  }
  return new StorageReference(path)
}

export async function uploadBytes(
  target: StorageReference,
  data: unknown,
  metadata?: Record<string, unknown>,
) {
  maybeFail('uploadBytes')
  objects.set(target.fullPath, { data, metadata })
  return { ref: target, metadata: { fullPath: target.fullPath, ...metadata } }
}

export function uploadBytesResumable(
  target: StorageReference,
  data: unknown,
  metadata?: Record<string, unknown>,
) {
  objects.set(target.fullPath, { data, metadata })
  const snapshot = { ref: target, bytesTransferred: 1, totalBytes: 1, state: 'success' }
  return {
    snapshot,
    on(_event: string, next?: (s: unknown) => void, _err?: unknown, complete?: () => void) {
      queueMicrotask(() => {
        next?.(snapshot)
        complete?.()
      })
      return () => {}
    },
    then(resolve: (s: unknown) => void) {
      resolve(snapshot)
    },
  }
}

export async function getDownloadURL(target: StorageReference): Promise<string> {
  maybeFail('getDownloadURL')
  if (!objects.has(target.fullPath)) {
    throw Object.assign(new Error('object-not-found'), { code: 'storage/object-not-found' })
  }
  return `https://firebasestorage.googleapis.com/v0/b/fake-bucket/o/${encodeURIComponent(target.fullPath)}?alt=media&token=t`
}

export async function deleteObject(target: StorageReference): Promise<void> {
  maybeFail('deleteObject')
  if (!objects.delete(target.fullPath)) {
    throw Object.assign(new Error('object-not-found'), { code: 'storage/object-not-found' })
  }
}

export async function getMetadata(target: StorageReference) {
  const obj = objects.get(target.fullPath)
  if (!obj) throw Object.assign(new Error('object-not-found'), { code: 'storage/object-not-found' })
  return { fullPath: target.fullPath, ...obj.metadata }
}

export function __reset(): void {
  objects.clear()
  failNext = null
}
export function __put(path: string, data: unknown = 'x'): void {
  objects.set(path, { data })
}
export function __has(path: string): boolean {
  return objects.has(path)
}
export function __object(path: string): StoredObject | undefined {
  return objects.get(path)
}
export function __paths(): string[] {
  return [...objects.keys()].sort()
}
export function __failNext(fn: string, error: unknown = new Error('storage failure')): void {
  failNext = { fn, error }
}
