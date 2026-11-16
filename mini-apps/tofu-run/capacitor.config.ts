import type { CapacitorConfig } from '@capacitor/cli'

// Own appId — installs side by side with the RiDE app and never shares its
// WebView storage, plugins or Android project.
const config: CapacitorConfig = {
  appId: 'com.ride78.tofurun',
  appName: '送豆腐',
  webDir: 'dist',
}

export default config
