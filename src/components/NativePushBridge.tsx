import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { nativePushAvailable, syncPushToken, removeNativePush } from '@/lib/nativePush';
import { safePushPath } from '../../supabase/functions/_shared/notificationContent';

export function NativePushBridge({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useRef(userId);
  const pending = useRef<{ path: string; recipientId: string }>();
  currentUser.current = userId;
  useEffect(() => {
    if (!nativePushAvailable()) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const add = async (handle: Promise<PluginListenerHandle>) => {
      const listener = await handle;
      if (disposed) await listener.remove(); else handles.push(listener);
    };
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['activity-feed'] });
      qc.invalidateQueries({ queryKey: ['unread-activity-count'] });
    };
    const init = async () => {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      await add(FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const data = notification.data as Record<string, unknown> | undefined;
        if (typeof data?.recipientId !== 'string') return;
        const target = { path: safePushPath(data.path), recipientId: data.recipientId };
        if (currentUser.current === target.recipientId) { navigate(target.path); refresh(); }
        else if (!currentUser.current) pending.current = target;
      }));
      await add(FirebaseMessaging.addListener('tokenReceived', ({ token }) => { void syncPushToken(token).catch(() => undefined); }));
      await add(FirebaseMessaging.addListener('notificationReceived', refresh));
      const { App } = await import('@capacitor/app');
      await add(App.addListener('appStateChange', ({ isActive }) => { if (isActive) { refresh(); void syncPushToken().catch(() => undefined); } }));
      await syncPushToken();
    };
    void init().catch(() => undefined);
    return () => { disposed = true; handles.forEach(h => { void h.remove(); }); };
  }, [navigate, qc]);
  useEffect(() => {
    if (userId) {
      if (pending.current?.recipientId === userId) { navigate(pending.current.path); pending.current = undefined; }
      void syncPushToken().catch(() => undefined);
    } else { void removeNativePush().catch(() => undefined); }
  }, [userId, navigate]);
  return null;
}