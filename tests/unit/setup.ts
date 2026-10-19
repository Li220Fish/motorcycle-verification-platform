import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'

import * as fakeFirestore from './fakes/firestore'
import * as fakeFunctions from './fakes/functions'
import * as fakeStorage from './fakes/storage'

// The real firebase.ts initializes an app against the staging project at
// import time — every unit test runs against in-memory fakes instead.
vi.mock('@/services/firebase/firebase', () => ({
  firebaseApp: { name: 'test-app' },
  auth: { currentUser: null, languageCode: null },
  db: { type: 'firestore-stub' },
  storage: { type: 'storage-stub' },
  functions: { type: 'functions-stub' },
}))
vi.mock('firebase/firestore', () => import('./fakes/firestore'))
vi.mock('firebase/storage', () => import('./fakes/storage'))
vi.mock('firebase/functions', () => import('./fakes/functions'))
// The real module imports the router (and through it every view); its own
// test loads it with vi.importActual.
vi.mock('@/services/firebase/push-notification.service', () => ({
  pushNotificationService: {
    initialize: vi.fn(async () => {}),
    forgetToken: vi.fn(async () => {}),
  },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  fakeFirestore.__reset()
  fakeStorage.__reset()
  fakeFunctions.__reset()
  try {
    localStorage.clear()
  } catch {
    // happy-dom always provides it; guard kept for other environments.
  }
})
