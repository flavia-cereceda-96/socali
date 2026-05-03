import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  userId: string | null;
}

export function EmailNotificationsPrompt({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email_notifications')
        .eq('user_id', userId)
        .maybeSingle();
      if (!cancelled && data && data.email_notifications === null) {
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const choose = async (value: boolean) => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications: value })
      .eq('user_id', userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['email-notifications-pref'] });
    setOpen(false);
    toast.success(value ? "You'll get email updates" : 'Email updates turned off');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Stay in the loop</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Get email updates when something needs your attention in Socali. You can always change this later in Settings.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={() => choose(true)}
                disabled={saving}
                className="w-full font-semibold"
              >
                Yes, notify me
              </Button>
              <Button
                onClick={() => choose(false)}
                disabled={saving}
                variant="ghost"
                className="w-full font-medium text-muted-foreground"
              >
                No thanks
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}