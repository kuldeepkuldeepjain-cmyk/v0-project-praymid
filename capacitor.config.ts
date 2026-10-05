import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.elitefund.app',
  appName: 'Elite Fund',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://elitefund.sbs',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1800,
      backgroundColor: '#07111f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07111f',
    },
  },
}

export default config
