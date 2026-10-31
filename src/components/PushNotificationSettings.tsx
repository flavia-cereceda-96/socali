import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { nativePushAvailable, syncPushToken, removeNativePush } from '@/lib/nativePush';

export function PushNotificationSettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const { data: enabled = false, isLoading } = useQuery({
    queryKey: ['push-notifications-pref'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await supabase.from('profiles').select('push_notifications').eq('user_id', user.id).single();
      if (error) throw error;
      return data.push_notifications;
    },
  });
  const toggle = async (value: boolean) => {
    if (!nativePushAvailable()) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (value) {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const permission = await FirebaseMessaging.requestPermissions();
        if (permission.receive !== 'granted') { setPermissionDenied(true); return; }
      }
      const { error } = await supabase.from('profiles').update({ push_notifications: value, notification_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }).eq('user_id', user.id);
      if (error) throw error;
      qc.setQueryData(['push-notifications-pref'], value);
      if (value) {
        try { await syncPushToken(); }
        catch (error) {
          await supabase.from('profiles').update({ push_notifications: false }).eq('user_id', user.id);
          qc.setQueryData(['push-notifications-pref'], false);
          throw error;
        }
      } else await removeNativePush();
      setPermissionDenied(false);
      toast.success(t(value ? 'push.enabled' : 'push.disabled'));
    } catch { toast.error(t('push.error')); }
    finally { setBusy(false); }
  };
  return <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3.5">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-foreground">{t('push.title')}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t(!nativePushAvailable() ? 'push.nativeOnly' : permissionDenied ? 'push.denied' : 'push.description')}</p>
    </div>
    <Switch checked={enabled} disabled={busy || isLoading || !nativePushAvailable()} onCheckedChange={toggle} aria-label={t('push.title')} />
  </div>;
}