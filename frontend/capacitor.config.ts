import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wkly.app',
  appName: 'Wkly',
  webDir: 'dist',
  server: {
    // Use https scheme on Android so cookies and secure APIs work correctly
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#17001b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',       // dark text/icons — use 'light' if your status bar bg is dark
      backgroundColor: '#4d0057',
      overlaysWebView: false,
    },
  },
};

export default config;
