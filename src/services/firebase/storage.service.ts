import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { storage } from './firebase'

function timestampedName(fileName: string): string {
  return `${Date.now()}-${fileName}`
}

/**
 * Public content — marketplace listing photos, discussion post images. The
 * returned value IS the permanent download URL, persisted directly into
 * Firestore. No confidentiality requirement, unlike uploadPrivateFile below.
 */
async function uploadFileAtPath(path: string, file: Blob): Promise<string> {
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

/**
 * Private content (verification evidence, chat images). Returns the Storage
 * OBJECT PATH, not a download URL — a getDownloadURL() result embeds a
 * permanent token that bypasses storage.rules forever for anyone who ever
 * obtains that string, even after the caller's access is revoked. Persist
 * the path; resolve a fresh, rules-checked URL at display time via
 * resolveDownloadUrl() (see src/composables/useStorageUrl.ts).
 */
async function uploadPrivateFile(path: string, file: Blob): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return path
}

/** Resolves a Storage object path (from uploadPrivateFile) to a fresh
 * download URL. Re-checked against storage.rules on every call — never
 * cache/persist the result past the current session. */
async function resolveDownloadUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}

async function uploadEvidenceFile(
  verificationId: string,
  itemId: string,
  file: Blob,
  extension: string,
): Promise<string> {
  return uploadPrivateFile(
    `verifications/${verificationId}/evidence/${timestampedName(`${itemId}.${extension}`)}`,
    file,
  )
}

async function uploadChatImage(
  conversationId: string,
  uid: string,
  messageId: string,
  file: Blob,
): Promise<string> {
  return uploadPrivateFile(`conversations/${conversationId}/${uid}/${messageId}/image.jpg`, file)
}

async function uploadDiscussionImage(postId: string, imageId: string, file: Blob): Promise<string> {
  return uploadFileAtPath(`discussion/${postId}/${imageId}.jpg`, file)
}

/** Owner's own gallery photos — non-sensitive, public URL like marketplace
 * photos (storage.rules already reserves vehicles/{id}/** for this). */
async function uploadVehiclePhoto(
  vehicleId: string,
  file: Blob,
  extension: string,
): Promise<string> {
  return uploadFileAtPath(
    `vehicles/${vehicleId}/photos/${timestampedName(`photo.${extension}`)}`,
    file,
  )
}

/** 行照 (registration certificate) photo — read only by the Trusted Backend's
 * verifyVehicleRegistrationDocument (which fetches it by URL for OCR). */
async function uploadVehicleRegistrationDocument(
  vehicleId: string,
  file: Blob,
  extension: string,
): Promise<string> {
  return uploadFileAtPath(
    `vehicles/${vehicleId}/registration/${timestampedName(`document.${extension}`)}`,
    file,
  )
}

export const storageService = {
  uploadFileAtPath,
  uploadPrivateFile,
  resolveDownloadUrl,
  uploadEvidenceFile,
  uploadChatImage,
  uploadDiscussionImage,
  uploadVehiclePhoto,
  uploadVehicleRegistrationDocument,
}
