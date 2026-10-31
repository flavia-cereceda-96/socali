import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.socali.app',
  appName: 'Cali',
  webDir: 'dist',
  plugins: {
    FirebaseMessaging: { presentationOptions: ['alert', 'sound'] },
  },
  experimental: {
    ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: true } } } },
  },
};

export default config;
