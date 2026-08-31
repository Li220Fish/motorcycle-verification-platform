import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { storage } from './firebase'

export type StorageFolder =
  | 'vehicle-images'
  | 'verification-images'
  | 'verification-videos'
  | 'verification-audio'
  | 'voltage-data'

function buildPath(folder: StorageFolder, fileName: string): string {
  const safeName = `${Date.now()}-${fileName}`
  return `${folder}/${safeName}`
}

async function uploadFile(folder: StorageFolder, file: Blob, fileName: string): Promise<string> {
  const storageRef = ref(storage, buildPath(folder, fileName))
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

/**
 * For paths with their own required nesting (chat-media/{conversationId}/...,
 * discussion-media/{postId}/...) instead of the flat folder/filename layout
 * `uploadFile` uses — the caller builds the full path so storage.rules can
 * authorize per-conversation / per-post writes.
 */
async function uploadFileAtPath(path: string, file: Blob): Promise<string> {
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

async function uploadChatImage(
  conversationId: string,
  messageId: string,
  file: Blob,
): Promise<string> {
  return uploadFileAtPath(`chat-media/${conversationId}/${messageId}/image.jpg`, file)
}

async function uploadDiscussionImage(postId: string, imageId: string, file: Blob): Promise<string> {
  return uploadFileAtPath(`discussion-media/${postId}/${imageId}.jpg`, file)
}

export const storageService = {
  uploadFile,
  uploadFileAtPath,
  uploadChatImage,
  uploadDiscussionImage,
}
