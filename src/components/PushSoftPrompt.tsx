import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import CalMascot from '@/components/CalMascot';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { PUSH_PROMPT_EVENT, enableNativePush, recordSoftPromptAccepted, recordSoftPromptDismissed } from '@/lib/pushPrompt';

export function PushSoftPrompt() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(PUSH_PROMPT_EVENT, show);
    return () => window.removeEventListener(PUSH_PROMPT_EVENT, show);
  }, []);
  const notNow = () => { recordSoftPromptDismissed(); setOpen(false); };
  const turnOn = async () => {
    setBusy(true);
    try {
      recordSoftPromptAccepted();
      const result = await enableNativePush();
      qc.invalidateQueries({ queryKey: ['push-notifications-pref'] });
      if (result === 'enabled') toast.success(t('push.enabled'));
      else if (result === 'denied') toast.error(t('push.denied'));
      setOpen(false);
    } catch { toast.error(t('push.error')); }
    finally { setBusy(false); }
  };
  return <Drawer open={open} onOpenChange={o => { if (!o && !busy) notNow(); }}>
    <DrawerContent className="px-6 pb-8 pt-4">
      <div className="mb-3 flex justify-center">
        <CalMascot mood="excited" size={80} animate />
      </div>
      <DrawerTitle className="text-center text-lg font-bold">{t('push.softPromptTitle')}</DrawerTitle>
      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={turnOn} disabled={busy}>{t('push.turnOn')}</Button>
        <Button variant="ghost" onClick={notNow} disabled={busy}>{t('push.notNow')}</Button>
      </div>
    </DrawerContent>
  </Drawer>;
}
