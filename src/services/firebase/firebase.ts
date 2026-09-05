import { type FirebaseApp, initializeApp } from 'firebase/app'
import {
  type Auth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
} from 'firebase/auth'
import { type Firestore, getFirestore } from 'firebase/firestore'
import { type Functions, getFunctions } from 'firebase/functions'
import { type FirebaseStorage, getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig)

/** indexedDB hangs without erroring in some WKWebView/Capacitor contexts,
 *  so onAuthStateChanged never fires — fall back through the persistence
 *  chain instead of using the indexedDB-only default from getAuth(). */
export const auth: Auth = initializeAuth(firebaseApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
})
export const db: Firestore = getFirestore(firebaseApp)
export const storage: FirebaseStorage = getStorage(firebaseApp)
/** Trusted Backend (functions/) — Gemini Vision/Audio inspection, OCR
 *  routing, IMU analysis. Default region (us-central1) on both sides. */
export const functions: Functions = getFunctions(firebaseApp)
