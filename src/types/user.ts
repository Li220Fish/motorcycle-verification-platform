export interface User {
  id: string
  email: string
  displayName: string | null
  photoUrl: string | null
  createdAt: number
  updatedAt: number
  /** True only for a SharedReportView.vue anonymous session (signInAnonymous) —
   *  every other sign-in path (register/login) never produces this. Drives
   *  auth.store.ts's isAuthenticated (anonymous never counts, so the rest of
   *  the app's requiresAuth routes stay closed to it) and
   *  InspectionReportBody.vue's `restricted` gate (photos/AI notes hidden
   *  until a REAL account, not just any Firebase Auth session). */
  isAnonymous: boolean
}
