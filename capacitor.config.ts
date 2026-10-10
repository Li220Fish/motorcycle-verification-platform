import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // appId left unchanged on purpose — it's the Android/iOS bundle
  // identifier, not a display name. Changing it makes a NEW app as far as
  // either store/OS is concerned (can't update in place, no existing
  // install carries over), which is a much bigger call than a rename; only
  // appName (what shows under the home-screen icon) changes here.
  appId: 'com.motorcycleverify.app',
  appName: 'RiDE78',
  webDir: 'dist',
}

export default config
