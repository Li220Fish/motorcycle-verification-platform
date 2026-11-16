import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Same Firebase project as the RiDE test environment (.env.staging), but its
// own anonymous accounts and its own tofu* collections / tofu/ storage
// prefix (see firestore.rules' 「送豆腐」 section).
const app = initializeApp(
  {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  'tofu-run',
)

// indexedDB can hang inside Android WebViews — fall back through the chain.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
})
export const db = getFirestore(app)
export const storage = getStorage(app)

/** Every player is an anonymous account bound to this phone. */
export function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, (user) => {
      if (user) {
        off()
        resolve(user)
      }
    })
    if (!auth.currentUser) signInAnonymously(auth).catch((error) => {
      off()
      reject(error)
    })
  })
}
