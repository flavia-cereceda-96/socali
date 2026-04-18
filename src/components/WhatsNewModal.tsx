import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface AppUpdate {
  id: string;
  title: string;
  summary: string;
  emoji: string;
  created_at: string;
}

export function WhatsNewModal() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Get most recent update
      const { data: latest } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest || cancelled) return;

      // Check if user has read it
      const { data: read } = await supabase
        .from('user_update_reads')
        .select('id')
        .eq('user_id', user.id)
        .eq('update_id', latest.id)
        .maybeSingle();

      if (!read && !cancelled) {
        setUpdate(latest as AppUpdate);
        setOpen(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = async () => {
    if (!update) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_update_reads').insert({
        user_id: user.id,
        update_id: update.id,
      });
    }
    setOpen(false);
  };

  if (!update) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="mx-auto mb-2 text-5xl"
          >
            {update.emoji}
          </motion.div>
          <DialogTitle className="text-center text-xl">{update.title}</DialogTitle>
          <DialogDescription className="text-center pt-2 whitespace-pre-wrap text-foreground/80">
            {update.summary}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleDismiss} className="w-full font-semibold mt-2" size="lg">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
