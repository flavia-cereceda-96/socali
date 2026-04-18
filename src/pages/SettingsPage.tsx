import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useEvents';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, CalendarPlus, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';

const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const [autoExport, setAutoExport] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

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

  useEffect(() => {
    if (profile) {
      setAutoExport(!!(profile as any).gcal_auto_export);
    }
  }, [profile]);

  const toggleAutoExport = async (next: boolean) => {
    setAutoExport(next);
    setSavingPref(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ gcal_auto_export: next } as any)
        .eq('user_id', user.id);
      if (error) {
        setAutoExport(!next);
        toast.error(error.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(next ? 'Auto-export to Google Calendar enabled' : 'Auto-export disabled');
    } finally {
      setSavingPref(false);
    }
  };

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
            Settings
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Google Calendar */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Google Calendar</h2>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="auto-export" className="text-sm font-medium">
                    Auto-export new events
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When you RSVP yes or create a plan, we'll automatically open Google Calendar to add it.
                  </p>
                </div>
                <Switch
                  id="auto-export"
                  checked={autoExport}
                  onCheckedChange={toggleAutoExport}
                  disabled={savingPref}
                />
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  💡 You can always export individual events using the <span className="font-medium text-foreground">Add to Google Calendar</span> button on each event's detail page.
                </p>
              </div>
            </div>
          </section>

          {/* Admin: post an update */}
          {isAdmin && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Post update to all users</h2>
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
                    placeholder="What's new?"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={updSummary}
                  onChange={e => setUpdSummary(e.target.value)}
                  placeholder="Quick summary of what changed..."
                  rows={4}
                  className="resize-none"
                />
                <Button
                  onClick={handlePostUpdate}
                  disabled={posting}
                  className="w-full font-semibold"
                >
                  {posting ? 'Posting...' : 'Post update'}
                </Button>
              </div>
            </section>
          )}

          {/* Logout */}
          <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground gap-2">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
