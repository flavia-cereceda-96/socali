import { useState, useMemo } from 'react';
import { useEvents, DbEvent } from '@/hooks/useEvents';
import { motion } from 'framer-motion';
import { CalendarDays, Check, X, HelpCircle, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useEvents();
  const [rsvpStates, setRsvpStates] = useState<Record<string, string>>({});

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 18) return 'Good afternoon 👋';
    return 'Good evening 🌙';
  })();

  const { confirmedPlans, pendingRsvps } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const weekEvents = events.filter(e => {
      const d = new Date(e.date);
      return d >= today && d <= nextWeek;
    });

    return {
      confirmedPlans: weekEvents.filter(
        e => e.participants.length === 0 || e.participants.every(p => p.status === 'confirmed')
      ),
      pendingRsvps: weekEvents.filter(e => {
        // Events where current user is a participant with status 'suggested'
        return e.participants.some(p => p.status === 'suggested');
      }),
    };
  }, [events]);

  const handleRsvp = async (event: DbEvent, participantId: string, status: string) => {
    setRsvpStates(prev => ({ ...prev, [event.id]: status }));
    const { error } = await supabase
      .from('event_participants')
      .update({ status })
      .eq('id', participantId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const unresolvedRsvps = pendingRsvps.filter(e => !rsvpStates[e.id]);

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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold text-foreground">Your Week</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{confirmedPlans.length} confirmed plan{confirmedPlans.length !== 1 ? 's' : ''} this week</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Upcoming Plans
        </motion.h2>
        <div className="flex flex-col gap-3 mb-8">
          {confirmedPlans.length > 0 ? (
            confirmedPlans.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
                onClick={() => navigate(`/event/${event.id}`)}
                className="flex gap-3 rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-shadow hover:shadow-elevated active:scale-[0.99]"
              >
                <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 px-3 py-2 min-w-[52px]">
                  <span className="text-xs font-semibold uppercase text-primary">
                    {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {new Date(event.date).getDate()}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{event.emoji}</span>
                    <span className="font-semibold text-foreground truncate">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {event.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>}
                    {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>}
                  </div>
                  {event.participants.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {event.participants.map(p => p.profile?.username || 'Unknown').join(', ')}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No confirmed plans yet — time to create one! ✨</p>
          )}
        </div>

        {unresolvedRsvps.length > 0 && (
          <>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Pending RSVPs
            </motion.h2>
            <div className="flex flex-col gap-3">
              {unresolvedRsvps.map((event, i) => {
                const myParticipation = event.participants.find(p => p.status === 'suggested');
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 + i * 0.06 }}
                    className="rounded-2xl bg-card p-4 shadow-card"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{event.emoji}</span>
                      <span className="font-semibold text-foreground">{event.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {event.time && ` · ${event.time}`}
                      {event.location && ` · ${event.location}`}
                    </p>
                    {myParticipation && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" className="flex-1 gap-1" onClick={() => handleRsvp(event, myParticipation.id, 'confirmed')}>
                          <Check className="h-3.5 w-3.5" /> Confirm
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1 gap-1" onClick={() => handleRsvp(event, myParticipation.id, 'maybe')}>
                          <HelpCircle className="h-3.5 w-3.5" /> Maybe
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1 gap-1" onClick={() => handleRsvp(event, myParticipation.id, 'declined')}>
                          <X className="h-3.5 w-3.5" /> Decline
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
