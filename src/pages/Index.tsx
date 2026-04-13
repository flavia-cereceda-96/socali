import { useState } from 'react';
import { events } from '@/data/mockData';
import { EventCard } from '@/components/EventCard';
import { motion } from 'framer-motion';
import { CalendarDays, Check, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type RsvpStatus = 'confirmed' | 'maybe' | 'declined' | null;

const Index = () => {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 18) return 'Good afternoon 👋';
    return 'Good evening 🌙';
  })();

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const weekEvents = events.filter(e => e.date >= today && e.date <= nextWeek);

  // Confirmed plans: created by you OR all participants confirmed
  const confirmedPlans = weekEvents.filter(
    e => e.createdBy === 'you' || e.participants.every(p => p.status === 'confirmed')
  );

  // Pending RSVPs: events created by others (invitations to you)
  const pendingRsvps = weekEvents.filter(e => e.createdBy !== 'you');

  const [rsvpStates, setRsvpStates] = useState<Record<string, RsvpStatus>>({});

  const handleRsvp = (eventId: string, status: RsvpStatus) => {
    setRsvpStates(prev => ({ ...prev, [eventId]: status }));
  };

  const unresolvedRsvps = pendingRsvps.filter(e => !rsvpStates[e.id]);

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold text-foreground">Your Week</h1>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{confirmedPlans.length} confirmed plan{confirmedPlans.length !== 1 ? 's' : ''} this week</span>
        </motion.div>

        {/* Upcoming Confirmed Plans */}
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
              <EventCard key={event.id} event={event} index={i} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No confirmed plans yet.</p>
          )}
        </div>

        {/* Pending RSVPs */}
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
              {unresolvedRsvps.map((event, i) => (
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
                    <span className="text-xs text-muted-foreground ml-auto">from {event.createdBy}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {event.time}
                    {event.location && ` · ${event.location}`}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="flex-1 gap-1" onClick={() => handleRsvp(event.id, 'confirmed')}>
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 gap-1" onClick={() => handleRsvp(event.id, 'maybe')}>
                      <HelpCircle className="h-3.5 w-3.5" /> Maybe
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 gap-1" onClick={() => handleRsvp(event.id, 'declined')}>
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
