import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p437aa7d002a1413ba0ad9ce0f8a8fbfe',
  appName: 'socali',
  webDir: 'dist',
  server: {
    url: 'https://437aa7d0-02a1-413b-a0ad-9ce0f8a8fbfe.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    FirebaseMessaging: { presentationOptions: ['alert', 'sound'] },
  },
  experimental: {
    ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: true } } } },
  },
};

export default config;
