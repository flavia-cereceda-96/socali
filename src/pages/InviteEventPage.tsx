import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { toast } from 'sonner';

interface InviteInfo {
  event_id: string;
  title: string;
  emoji: string;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  event_end_time: string | null;
  location: string | null;
  cover_image: string | null;
  inviter_id: string;
  inviter_username: string | null;
  inviter_avatar: string | null;
}

const PENDING_KEY = 'pending_event_invite_token';

export const consumePendingInvite = async (): Promise<string | null> => {
  const token = localStorage.getItem(PENDING_KEY);
  if (!token) return null;
  localStorage.removeItem(PENDING_KEY);
  return token;
};

const InviteEventPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setAuthed(!!sess.session);
      const { data, error } = await supabase.rpc('get_invite_info', { _token: token });
      if (error || !data || data.length === 0) {
        setInfo(null);
      } else {
        setInfo(data[0] as InviteInfo);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSignUp = () => {
    if (!token) return;
    localStorage.setItem(PENDING_KEY, token);
    navigate('/welcome');
  };

  const handleLogin = () => {
    if (!token) return;
    localStorage.setItem(PENDING_KEY, token);
    navigate('/login');
  };

  const handleRespond = async (status: 'confirmed' | 'declined') => {
    if (!token) return;
    setResponding(true);
    const { data, error } = await supabase.rpc('join_event_via_invite', {
      _token: token,
      _status: status,
    });
    setResponding(false);
    if (error) {
      toast.error(error.message || 'Could not respond');
      return;
    }
    if (status === 'confirmed') toast.success("You're in! 🎉");
    else toast.success('Declined');
    navigate(`/event/${data}`, { replace: true });
  };

  if (loading || authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invite...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl">🤷</p>
        <h1 className="mt-3 text-xl font-bold">Invite link not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This invite link may have expired or been removed.
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>
          Go home
        </Button>
      </div>
    );
  }

  const dateStr = new Date(info.event_date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const inviterName = info.inviter_username ? `@${info.inviter_username}` : 'Someone';

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">You're invited!</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">
              {info.emoji} {info.title}
            </h1>
          </div>

          <div className="rounded-3xl bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={info.inviter_avatar}
                username={info.inviter_username || '?'}
                size="md"
              />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{inviterName}</span> invited you to this plan
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{dateStr}{info.event_time ? ` · ${info.event_time.slice(0, 5)}` : ''}</span>
            </div>

            {info.location && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate">{info.location}</span>
              </div>
            )}
          </div>

          {authed ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleRespond('declined')}
                disabled={responding}
              >
                <X className="mr-2 h-4 w-4" /> Decline
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleRespond('confirmed')}
                disabled={responding}
              >
                <Check className="mr-2 h-4 w-4" /> Join
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button className="w-full" size="lg" onClick={handleSignUp}>
                Create an account to join
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleLogin}>
                I already have an account
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default InviteEventPage;