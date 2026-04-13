import { useState, useEffect } from 'react';
import { useEvents, DbEvent } from '@/hooks/useEvents';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import { MapPin, Clock, Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const RequestsPage = () => {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useEvents();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  // Events where the current user is a participant (not creator)
  const invitations = events.filter(e => e.created_by !== userId && e.participants.some(p => p.user_id === userId));

  const handleRsvp = async (participantId: string, status: string) => {
    const { error } = await supabase
      .from('event_participants')
      .update({ status })
      .eq('id', participantId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['pending-request-count'] });
    }
  };

  const pending = invitations.filter(e => {
    const myP = e.participants.find(p => p.user_id === userId);
    return myP?.status === 'suggested';
  });

  const responded = invitations.filter(e => {
    const myP = e.participants.find(p => p.user_id === userId);
    return myP && myP.status !== 'suggested';
  });

  const renderCard = (event: DbEvent, index: number) => {
    const myP = event.participants.find(p => p.user_id === userId);
    if (!myP) return null;
    const currentStatus = myP.status;

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.35 }}
        className="rounded-2xl bg-card p-4 shadow-card"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{event.emoji}</span>
            <div>
              <h3 className="font-semibold text-foreground">{event.title}</h3>
            </div>
          </div>
          <StatusBadge status={currentStatus as any} />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {event.time && ` · ${event.time}`}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{event.location}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleRsvp(myP.id, 'confirmed')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all',
              currentStatus === 'confirmed'
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-secondary text-muted-foreground hover:bg-green-500/10 hover:text-green-600'
            )}
          >
            <Check className="h-4 w-4" /> Going
          </button>
          <button
            onClick={() => handleRsvp(myP.id, 'maybe')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all',
              currentStatus === 'maybe'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-secondary text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600'
            )}
          >
            <HelpCircle className="h-4 w-4" /> Maybe
          </button>
          <button
            onClick={() => handleRsvp(myP.id, 'declined')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all',
              currentStatus === 'declined'
                ? 'bg-destructive text-white shadow-sm'
                : 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            )}
          >
            <X className="h-4 w-4" /> Decline
          </button>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-2xl font-bold text-foreground"
        >
          Plan Requests
        </motion.h1>

        {invitations.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No invitations yet ✨</p>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending ({pending.length})
                </h2>
                <div className="mb-6 flex flex-col gap-3">
                  {pending.map((e, i) => renderCard(e, i))}
                </div>
              </>
            )}
            {responded.length > 0 && (
              <>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Responded ({responded.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {responded.map((e, i) => renderCard(e, i))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
