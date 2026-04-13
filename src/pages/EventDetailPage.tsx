import { useParams, useNavigate } from 'react-router-dom';
import { events } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Calendar, MessageSquare, User } from 'lucide-react';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = events.find(e => e.id === id);

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const dateStr = event.date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        {/* Header */}
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

        {/* Details Card */}
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
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>{event.time}</span>
          </div>
          {event.location && (
            <div className="flex items-start gap-3 text-sm text-foreground">
              <MapPin className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">{event.location}</p>
                {event.address && <p className="text-xs text-muted-foreground">{event.address}</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <User className="h-4 w-4 text-primary" />
            <span>Created by {event.createdBy}</span>
          </div>
          {event.notes && (
            <div className="flex items-start gap-3 text-sm text-foreground">
              <MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
              <p>{event.notes}</p>
            </div>
          )}
        </motion.div>

        {/* Participants */}
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
                key={p.friend.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
              >
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-card">
                  {p.friend.avatar ? (
                    <img src={p.friend.avatar} alt={p.friend.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary text-lg">
                      {p.friend.emoji}
                    </div>
                  )}
                </div>
                <span className="flex-1 font-medium text-foreground">{p.friend.name}</span>
                <StatusBadge status={p.status} size="md" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventDetailPage;
