import { ref, watch, type Ref } from 'vue'

import { storageService } from '@/services/firebase/storage.service'

/**
 * Resolves a private-asset Storage object path (from
 * storageService.uploadPrivateFile/uploadEvidenceFile/uploadChatImage) to a
 * fresh, storage.rules-checked download URL — re-resolved whenever the path
 * changes, never cached across sessions. A value that's already an http(s)
 * URL (public assets like marketplace/discussion photos, or historical
 * `remoteUrl`/`imageUrl` data written before this fix) passes through
 * unchanged rather than being (incorrectly) treated as a Storage path.
 */
export function useStorageUrl(path: Ref<string | null | undefined>): Ref<string | undefined> {
  const resolvedUrl = ref<string | undefined>(undefined)

  watch(
    path,
    async (value) => {
      resolvedUrl.value = undefined
      if (!value) return
      if (/^https?:\/\//.test(value)) {
        resolvedUrl.value = value
        return
      }
      try {
        resolvedUrl.value = await storageService.resolveDownloadUrl(value)
      } catch {
        resolvedUrl.value = undefined
      }
    },
    { immediate: true },
  )

  return resolvedUrl
}
