import { useState } from 'react';
import { events, SocialEvent, EventStatus, friends } from '@/data/mockData';
import { AvatarGroup } from '@/components/AvatarGroup';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import { MapPin, Clock, Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RequestsPage = () => {
  const invitations = events.filter(e => e.createdBy !== 'you');

  const [rsvpState, setRsvpState] = useState<Record<string, EventStatus>>(() => {
    const initial: Record<string, EventStatus> = {};
    invitations.forEach(e => {
      // Find "your" status — assume you're the one with status 'suggested' or first participant
      const yourStatus = e.participants.find(p => p.status === 'suggested')?.status ?? 'suggested';
      initial[e.id] = yourStatus;
    });
    return initial;
  });

  const handleRsvp = (eventId: string, status: EventStatus) => {
    setRsvpState(prev => ({ ...prev, [eventId]: status }));
  };

  const pending = invitations.filter(e => rsvpState[e.id] === 'suggested');
  const responded = invitations.filter(e => rsvpState[e.id] !== 'suggested');

  const renderCard = (event: SocialEvent, index: number) => {
    const currentStatus = rsvpState[event.id];
    const inviter = event.createdBy;
    const isMultiDay = !!event.endDate;

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
              <p className="text-xs text-muted-foreground">Invited by {inviter}</p>
            </div>
          </div>
          <StatusBadge status={currentStatus} />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {isMultiDay && ` – ${event.endDate!.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
            {' · '}{event.time}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{event.location}
            </span>
          )}
        </div>

        <div className="mb-3">
          <AvatarGroup friends={event.participants.map(p => p.friend)} />
        </div>

        {/* RSVP Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => handleRsvp(event.id, 'confirmed')}
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
            onClick={() => handleRsvp(event.id, 'maybe')}
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
            onClick={() => handleRsvp(event.id, 'declined')}
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
