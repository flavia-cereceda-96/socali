import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  userId: string | null;
}

export function AvatarPrompt({ userId }: Props) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (sessionStorage.getItem('avatar-prompt-dismissed')) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (!cancelled && data && !data.avatar_url) setShow(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const dismiss = () => {
    sessionStorage.setItem('avatar-prompt-dismissed', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={() => navigate('/profile')}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-3 text-left hover:bg-primary/15 transition-colors"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Add a profile photo 📸</p>
            <p className="text-xs text-muted-foreground">Help your friends recognise you — Socali is more fun with faces!</p>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-foreground/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}