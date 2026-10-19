import { beforeEach, describe, expect, it, vi } from 'vitest'

const fa = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
  signInAnonymously: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  linkWithCredential: vi.fn(),
  signInWithEmailLink: vi.fn(),
  native: { value: false },
  nativeSignIn: vi.fn(),
  nativeSignOut: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  browserPopupRedirectResolver: { resolver: true },
  GoogleAuthProvider: Object.assign(function GoogleAuthProvider() {}, {
    credential: (idToken: string) => ({ providerId: 'google.com', idToken }),
  }),
  EmailAuthProvider: {
    credential: (email: string, password: string) => ({ email, password }),
    credentialWithLink: (email: string, link: string) => ({ email, link }),
  },
  ...Object.fromEntries(
    Object.entries(fa).filter(([k]) => !['native', 'nativeSignIn', 'nativeSignOut'].includes(k)),
  ),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => fa.native.value,
    getPlatform: () => (fa.native.value ? 'android' : 'web'),
  },
}))
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: { signInWithGoogle: fa.nativeSignIn, signOut: fa.nativeSignOut },
}))

import * as authService from '@/services/firebase/auth.service'
import { auth } from '@/services/firebase/firebase'

const fakeUser = { uid: 'u1', email: 'a@b.com', reload: vi.fn(), getIdToken: vi.fn() }
const mutableAuth = auth as unknown as { currentUser: unknown; languageCode: string | null }

beforeEach(() => {
  fa.native.value = false
  mutableAuth.currentUser = null
  mutableAuth.languageCode = null
})

describe('Google sign-in', () => {
  it('web: popup with the explicit popup resolver', async () => {
    fa.signInWithPopup.mockResolvedValue({ user: fakeUser })
    expect(await authService.signInWithGoogle()).toBe(fakeUser)
    expect(fa.signInWithPopup).toHaveBeenCalledWith(auth, expect.anything(), { resolver: true })
  })

  it('native: exchanges the native ID token for a JS-SDK credential', async () => {
    fa.native.value = true
    fa.nativeSignIn.mockResolvedValue({ credential: { idToken: 'tok' } })
    fa.signInWithCredential.mockResolvedValue({ user: fakeUser })
    expect(await authService.signInWithGoogle()).toBe(fakeUser)
    expect(fa.signInWithCredential).toHaveBeenCalledWith(auth, {
      providerId: 'google.com',
      idToken: 'tok',
    })
  })

  it('native: throws when no credential came back', async () => {
    fa.native.value = true
    fa.nativeSignIn.mockResolvedValue({ credential: null })
    await expect(authService.signInWithGoogle()).rejects.toThrow('Google 登入未取得憑證')
  })
})

describe('email/password', () => {
  it('register sets the display name only when given', async () => {
    fa.createUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser })
    await authService.register('a@b.com', 'pw', 'Alice')
    expect(fa.updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'Alice' })
    fa.updateProfile.mockClear()
    await authService.register('a@b.com', 'pw')
    expect(fa.updateProfile).not.toHaveBeenCalled()
  })

  it('login / anonymous / password reset pass through', async () => {
    fa.signInWithEmailAndPassword.mockResolvedValue({ user: fakeUser })
    fa.signInAnonymously.mockResolvedValue({ user: { uid: 'anon' } })
    expect(await authService.login('a@b.com', 'pw')).toBe(fakeUser)
    expect((await authService.signInAnonymous()).uid).toBe('anon')
    await authService.sendPasswordReset('a@b.com')
    expect(fa.sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'a@b.com')
  })

  it('logout signs out natively too (ignoring native failures)', async () => {
    fa.native.value = true
    fa.nativeSignOut.mockRejectedValue(new Error('x'))
    await authService.logout()
    expect(fa.signOut).toHaveBeenCalledWith(auth)
  })
})

describe('email verification', () => {
  it('requires a signed-in user', async () => {
    await expect(authService.sendVerificationEmail('zh-TW')).rejects.toThrow('Not authenticated')
  })

  it('web: sets the template language and continues back to /verify-email on this origin', async () => {
    mutableAuth.currentUser = fakeUser
    await authService.sendVerificationEmail('en')
    expect(mutableAuth.languageCode).toBe('en')
    expect(fa.sendEmailVerification).toHaveBeenCalledWith(fakeUser, {
      url: `${window.location.origin}/verify-email`,
    })
  })

  it('native: continues to the hosting domain (the WebView origin is not openable)', async () => {
    fa.native.value = true
    mutableAuth.currentUser = fakeUser
    await authService.sendVerificationEmail('zh-TW')
    expect(fa.sendEmailVerification).toHaveBeenCalledWith(fakeUser, {
      url: `https://${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}/verify-email`,
    })
  })

  it('reloadCurrentUser reloads and force-refreshes the token', async () => {
    expect(await authService.reloadCurrentUser()).toBeNull()
    mutableAuth.currentUser = fakeUser
    expect(await authService.reloadCurrentUser()).toBe(fakeUser)
    expect(fakeUser.reload).toHaveBeenCalled()
    expect(fakeUser.getIdToken).toHaveBeenCalledWith(true)
  })
})

describe('Google account email-link confirmation', () => {
  const gUser = { uid: 'g1', email: 'me@gmail.com' }
  const link = 'https://app/verify-email?mode=signIn&oobCode=abc'

  beforeEach(() => {
    for (const f of [
      fa.sendSignInLinkToEmail,
      fa.isSignInWithEmailLink,
      fa.linkWithCredential,
      fa.signInWithEmailLink,
    ])
      f.mockReset()
  })

  it('sends an email link to the account Gmail, back to /verify-email, handled in-app', async () => {
    await expect(authService.sendGoogleAccountVerificationLink('zh-TW')).rejects.toThrow(
      'Not authenticated',
    )
    mutableAuth.currentUser = gUser
    await authService.sendGoogleAccountVerificationLink('en')
    expect(mutableAuth.languageCode).toBe('en')
    expect(fa.sendSignInLinkToEmail).toHaveBeenCalledWith(auth, 'me@gmail.com', {
      url: `${window.location.origin}/verify-email`,
      handleCodeInApp: true,
    })
    expect(localStorage.getItem('motoverify:emailLinkFor')).toBe('me@gmail.com')
  })

  it('not an email link → false, nothing linked', async () => {
    fa.isSignInWithEmailLink.mockReturnValue(false)
    expect(await authService.completeEmailLinkVerification('https://app/verify-email')).toBe(false)
    expect(fa.linkWithCredential).not.toHaveBeenCalled()
  })

  it('signed in: links the email-link credential onto the current account', async () => {
    fa.isSignInWithEmailLink.mockReturnValue(true)
    mutableAuth.currentUser = gUser
    expect(await authService.completeEmailLinkVerification(link)).toBe(true)
    expect(fa.linkWithCredential).toHaveBeenCalledWith(gUser, { email: 'me@gmail.com', link })
  })

  it('already linked counts as success; other errors propagate', async () => {
    fa.isSignInWithEmailLink.mockReturnValue(true)
    mutableAuth.currentUser = gUser
    fa.linkWithCredential.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/provider-already-linked' }),
    )
    expect(await authService.completeEmailLinkVerification(link)).toBe(true)
    fa.linkWithCredential.mockRejectedValueOnce(
      Object.assign(new Error('expired'), { code: 'auth/invalid-action-code' }),
    )
    await expect(authService.completeEmailLinkVerification(link)).rejects.toThrow('expired')
  })

  it('signed out (link opened in another browser): signs in with the link using the stored email', async () => {
    fa.isSignInWithEmailLink.mockReturnValue(true)
    localStorage.setItem('motoverify:emailLinkFor', 'me@gmail.com')
    await authService.completeEmailLinkVerification(link)
    expect(fa.signInWithEmailLink).toHaveBeenCalledWith(auth, 'me@gmail.com', link)
    expect(localStorage.getItem('motoverify:emailLinkFor')).toBeNull()
  })

  it('signed out with no stored email → error', async () => {
    fa.isSignInWithEmailLink.mockReturnValue(true)
    await expect(authService.completeEmailLinkVerification(link)).rejects.toThrow('missing-email')
  })
})

describe('profile updates', () => {
  it('display name / photo require a session', async () => {
    await expect(authService.updateDisplayName('x')).rejects.toThrow()
    await expect(authService.updatePhotoURL('x')).rejects.toThrow()
    mutableAuth.currentUser = fakeUser
    await authService.updateDisplayName('Bob')
    await authService.updatePhotoURL(null)
    expect(fa.updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'Bob' })
    expect(fa.updateProfile).toHaveBeenCalledWith(fakeUser, { photoURL: null })
  })

  it('updateEmail re-authenticates then sends a verify-before-update link', async () => {
    await expect(authService.updateEmail('n@b.com', 'pw')).rejects.toThrow()
    mutableAuth.currentUser = fakeUser
    await authService.updateEmail('n@b.com', 'pw')
    expect(fa.reauthenticateWithCredential).toHaveBeenCalledWith(fakeUser, {
      email: 'a@b.com',
      password: 'pw',
    })
    expect(fa.verifyBeforeUpdateEmail).toHaveBeenCalledWith(fakeUser, 'n@b.com')
  })

  it('getCurrentUser / onAuthChange', () => {
    mutableAuth.currentUser = fakeUser
    expect(authService.getCurrentUser()).toBe(fakeUser)
    const cb = vi.fn()
    authService.onAuthChange(cb)
    expect(fa.onAuthStateChanged).toHaveBeenCalledWith(auth, cb)
  })
})
