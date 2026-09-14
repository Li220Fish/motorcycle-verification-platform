/**
 * Tracks whether the user has ever dismissed the verification usage tour
 * (VerificationTour.vue). Global, not per-verification — it's a one-time
 * "how this app works" walkthrough, not something tied to one vehicle's
 * checklist, so seeing it once (finish or skip, both count) on any
 * verification should skip it on every future one too.
 */
const TOUR_SEEN_KEY = 'motoverify:tour:verificationSeen'

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === '1'
  } catch {
    return true // storage unavailable — fail toward not blocking the flow with a tour
  }
}

function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, '1')
  } catch {
    // best-effort only
  }
}

export const tourService = {
  hasSeenTour,
  markTourSeen,
}
