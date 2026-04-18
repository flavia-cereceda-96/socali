import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Megaphone, Languages, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Admin-only update composer
  const [updTitle, setUpdTitle] = useState('');
  const [updEmoji, setUpdEmoji] = useState('✨');
  const [updSummary, setUpdSummary] = useState('');
  const [posting, setPosting] = useState(false);

  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
  });

  const handlePostUpdate = async () => {
    if (!updTitle.trim() || !updSummary.trim()) {
      toast.error('Title and summary are required');
      return;
    }
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('app_updates').insert({
        title: updTitle.trim(),
        summary: updSummary.trim(),
        emoji: updEmoji.trim() || '✨',
        created_by: user.id,
      });
      if (error) { toast.error(error.message); return; }
      setUpdTitle(''); setUpdSummary(''); setUpdEmoji('✨');
      toast.success('Update posted to all users! 📣');
    } finally {
      setPosting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <motion.h1
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {t('settings.title')}
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Language picker */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{t('settings.language')}</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">{t('settings.languageHint')}</p>
            <LanguageToggle variant="card" />
          </section>

          {/* Manage friends shortcut */}
          <section className="space-y-3">
            <button
              onClick={() => navigate('/people')}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-secondary/40"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{t('people.title')}</span>
              </div>
              <span className="text-muted-foreground">›</span>
            </button>
          </section>

          {/* Admin: post an update */}
          {isAdmin && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{t('settings.postUpdate')}</h2>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={updEmoji}
                    onChange={e => setUpdEmoji(e.target.value)}
                    className="w-16 text-center"
                    maxLength={2}
                  />
                  <Input
                    value={updTitle}
                    onChange={e => setUpdTitle(e.target.value)}
                    placeholder={t('settings.whatsNew')}
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={updSummary}
                  onChange={e => setUpdSummary(e.target.value)}
                  placeholder={t('settings.summaryPlaceholder')}
                  rows={4}
                  className="resize-none"
                />
                <Button
                  onClick={handlePostUpdate}
                  disabled={posting}
                  className="w-full font-semibold"
                >
                  {posting ? t('settings.posting') : t('settings.post')}
                </Button>
              </div>
            </section>
          )}

          {/* Logout */}
          <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground gap-2">
            <LogOut className="h-4 w-4" /> {t('settings.logout')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
