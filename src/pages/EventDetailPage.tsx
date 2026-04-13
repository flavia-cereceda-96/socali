import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { StatusBadge } from '@/components/StatusBadge';
import { EventComments } from '@/components/EventComments';
import { EventPhotos } from '@/components/EventPhotos';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Calendar, MessageSquare, User } from 'lucide-react';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useEvents();
  const event = events.find(e => e.id === id);

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

        {event.participants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Invited ({event.participants.length})
            </h2>
            <div className="flex flex-col gap-2">
              {event.participants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg">
                    👤
                  </div>
                  <span className="flex-1 font-medium text-foreground">
                    {p.profile?.username || 'Unknown'}
                  </span>
                  <StatusBadge status={p.status as any} size="md" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;
