import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.motorcycleverify.app',
  appName: 'RiDE',
  webDir: 'dist',
  plugins: {
    // Native Google account picker only hands back the credential;
    // skipNativeAuth keeps the actual Firebase session in the JS SDK (the
    // one every service in src/services/firebase already reads), via
    // signInWithCredential in auth.service.ts's signInWithGoogle.
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
}

export default config
