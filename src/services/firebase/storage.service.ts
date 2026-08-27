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

export const storageService = { uploadFile }
