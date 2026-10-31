import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
export const nativePushAvailable = () => Capacitor.isNativePlatform();
let currentToken: string | undefined;
export async function syncPushToken(token?: string) {
  if (!nativePushAvailable()) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile, error } = await supabase.from('profiles').select('push_notifications').eq('user_id', user.id).single();
  if (error) throw error;
  if (profile?.push_notifications !== true) return;
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  const permission = await FirebaseMessaging.checkPermissions();
  if (permission.receive !== 'granted') return;
  const value = token ?? (await FirebaseMessaging.getToken()).token;
  const { error: registerError } = await supabase.functions.invoke('register-push', { body: { token: value, platform: Capacitor.getPlatform() } });
  if (registerError) throw registerError;
  currentToken = value;
}
export async function removeNativePush() {
  if (!nativePushAvailable()) return;
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  if (currentToken) {
    const { error } = await supabase.functions.invoke('register-push', { body: { token: currentToken, platform: Capacitor.getPlatform(), remove: true } });
    if (error) throw error;
  }
  await FirebaseMessaging.deleteToken();
  await FirebaseMessaging.removeAllDeliveredNotifications();
  currentToken = undefined;
}