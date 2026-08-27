import { Capacitor } from '@capacitor/core'

export type PlatformName = 'web' | 'android' | 'ios'

class PlatformService {
  getPlatform(): PlatformName {
    return Capacitor.getPlatform() as PlatformName
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform()
  }

  isAndroid(): boolean {
    return this.getPlatform() === 'android'
  }

  isIOS(): boolean {
    return this.getPlatform() === 'ios'
  }

  isWeb(): boolean {
    return this.getPlatform() === 'web'
  }
}

export const platformService = new PlatformService()
