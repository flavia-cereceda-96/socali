import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { nativePushAvailable, removeNativePush } from '@/lib/nativePush';
import { enableNativePush } from '@/lib/pushPrompt';

const CATEGORIES = ['push_plans', 'push_rsvps', 'push_comments', 'push_group_chat', 'push_friends'] as const;
type Category = typeof CATEGORIES[number];
type Prefs = { push_notifications: boolean } & Record<Category, boolean>;

export function PushNotificationSettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['push-notifications-pref'],
    queryFn: async (): Promise<Prefs | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('push_notifications,push_plans,push_rsvps,push_comments,push_group_chat,push_friends').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
  });
  const enabled = !!prefs?.push_notifications;
  const toggle = async (value: boolean) => {
    if (!nativePushAvailable()) return;
    setBusy(true);
    try {
      if (value) {
        const result = await enableNativePush();
        if (result === 'denied') { setPermissionDenied(true); return; }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('profiles').update({ push_notifications: false }).eq('user_id', user.id);
        if (error) throw error;
        await removeNativePush();
      }
      setPermissionDenied(false);
      toast.success(t(value ? 'push.enabled' : 'push.disabled'));
    } catch { toast.error(t('push.error')); }
    finally { setBusy(false); qc.invalidateQueries({ queryKey: ['push-notifications-pref'] }); }
  };
  const setCategory = async (key: Category, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !prefs) return;
    qc.setQueryData(['push-notifications-pref'], { ...prefs, [key]: value });
    const { error } = await supabase.from('profiles').update({ [key]: value } as Partial<Record<Category, boolean>>).eq('user_id', user.id);
    if (error) { toast.error(t('push.error')); qc.invalidateQueries({ queryKey: ['push-notifications-pref'] }); }
  };
  return <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{t('push.title')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(!nativePushAvailable() ? 'push.nativeOnly' : permissionDenied ? 'push.denied' : 'push.description')}</p>
      </div>
      <Switch checked={enabled} disabled={busy || isLoading || !nativePushAvailable()} onCheckedChange={toggle} aria-label={t('push.title')} />
    </div>
    {enabled && prefs && <div className="mt-3 space-y-3 border-t border-border pt-3">
      {CATEGORIES.map(key => <div key={key} className="flex items-start justify-between gap-4 pl-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">{t(`push.categories.${key}.title`)}</p>
          <p className="text-xs text-muted-foreground">{t(`push.categories.${key}.description`)}</p>
        </div>
        <Switch checked={prefs[key]} onCheckedChange={v => setCategory(key, v)} aria-label={t(`push.categories.${key}.title`)} />
      </div>)}
    </div>}
  </div>;
}
