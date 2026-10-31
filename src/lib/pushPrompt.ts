import { supabase } from '@/integrations/supabase/client';
import { nativePushAvailable, syncPushToken } from '@/lib/nativePush';

export const PUSH_CATEGORY_DEFAULTS = { push_plans: true, push_rsvps: true, push_comments: true, push_group_chat: false, push_friends: true };
export type PushEnableResult = 'enabled' | 'denied' | 'unavailable';

/** Shared enable flow: OS permission → profile opt-in → token registration. Only call from a user tap. */
export async function enableNativePush(): Promise<PushEnableResult> {
  if (!nativePushAvailable()) return 'unavailable';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'unavailable';
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  const permission = await FirebaseMessaging.requestPermissions();
  if (permission.receive !== 'granted') return 'denied';
  const { data: current } = await supabase.from('profiles').select('push_plans,push_rsvps,push_comments,push_group_chat,push_friends').eq('user_id', user.id).single();
  const allOff = current && !Object.values(current).some(Boolean);
  const { error } = await supabase.from('profiles').update({
    push_notifications: true,
    notification_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(allOff ? PUSH_CATEGORY_DEFAULTS : {}),
  }).eq('user_id', user.id);
  if (error) throw error;
  try { await syncPushToken(); }
  catch (e) { await supabase.from('profiles').update({ push_notifications: false }).eq('user_id', user.id); throw e; }
  return 'enabled';
}

const KEY = 'socali_push_soft_prompt';
const WEEK = 7 * 24 * 3600 * 1000;
type PromptState = { dismissals: number; lastDismissedAt?: number; accepted?: boolean };
const read = (): PromptState => { try { return JSON.parse(localStorage.getItem(KEY) || '') as PromptState; } catch { return { dismissals: 0 }; } };

/** Shown first time; after one "Not now", once more after 7 days; never after that. */
export function softPromptEligible(state: PromptState, now = Date.now()) {
  if (state.accepted) return false;
  if (state.dismissals === 0) return true;
  if (state.dismissals === 1) return !!state.lastDismissedAt && now - state.lastDismissedAt >= WEEK;
  return false;
}
export function recordSoftPromptDismissed(now = Date.now()) {
  const s = read(); localStorage.setItem(KEY, JSON.stringify({ ...s, dismissals: s.dismissals + 1, lastDismissedAt: now }));
}
export function recordSoftPromptAccepted() { localStorage.setItem(KEY, JSON.stringify({ ...read(), accepted: true })); }

export const PUSH_PROMPT_EVENT = 'socali:push-soft-prompt';
/** Call after a successful RSVP or event creation. Never triggers the OS dialog itself. */
export async function maybeShowPushPrompt() {
  if (!nativePushAvailable() || !softPromptEligible(read())) return;
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  const { receive } = await FirebaseMessaging.checkPermissions();
  if (receive === 'granted' || receive === 'denied') return;
  window.dispatchEvent(new Event(PUSH_PROMPT_EVENT));
}
