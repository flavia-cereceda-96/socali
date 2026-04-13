import { useParams, useNavigate } from 'react-router-dom';
import { useEvents, DbEventWithCreator } from '@/hooks/useEvents';
import { StatusBadge } from '@/components/StatusBadge';
import { EventComments } from '@/components/EventComments';
import { EventPhotos } from '@/components/EventPhotos';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Calendar, MessageSquare, Crown } from 'lucide-react';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useEvents();
  const event = events.find(e => e.id === id) as DbEventWithCreator | undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dateStr = event.end_date
    ? `${fmt(event.date)} – ${fmt(event.end_date)}`
    : fmt(event.date);

  // Build attendees list: creator first, then participants
  const attendees = [
    {
      id: 'creator',
      user_id: event.created_by,
      username: event.creator_profile?.username || 'Unknown',
      avatar_url: event.creator_profile?.avatar_url || null,
      status: 'organizer' as const,
      isCreator: true,
    },
    ...event.participants.map(p => ({
      id: p.id,
      user_id: p.user_id,
      username: p.profile?.username || 'Unknown',
      avatar_url: p.profile?.avatar_url || null,
      status: p.status,
      isCreator: false,
    })),
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-3xl">{event.emoji}</span>
          <motion.h1
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {event.title}
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4 rounded-2xl bg-card p-5 shadow-card space-y-4"
        >
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{dateStr}</span>
          </div>
          {event.time && (
            <div className="flex items-center gap-3 text-sm text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>{event.time}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-start gap-3 text-sm text-foreground">
              <MapPin className="h-4 w-4 mt-0.5 text-primary" />
              <p className="font-medium">{event.location}</p>
            </div>
          )}
          {event.notes && (
            <div className="flex items-start gap-3 text-sm text-foreground">
              <MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
              <p>{event.notes}</p>
            </div>
          )}
        </motion.div>

        {/* Attendees */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Attendees ({attendees.length})
          </h2>
          <div className="flex flex-col gap-2">
            {attendees.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
              >
                <UserAvatar avatarUrl={a.avatar_url} username={a.username} size="md" />
                <span className="flex-1 font-medium text-foreground">
                  {a.username}
                </span>
                {a.isCreator ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Crown className="h-3 w-3" /> Organizer
                  </span>
                ) : (
                  <StatusBadge status={a.status as any} size="md" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Photos */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <EventPhotos eventId={event.id} />
        </motion.div>

        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <EventComments eventId={event.id} />
        </motion.div>
      </div>
    </div>
  );
};

export default EventDetailPage;
