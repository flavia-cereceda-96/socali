import { SocialEvent } from '@/data/mockData';
import { AvatarGroup } from './AvatarGroup';
import { StatusBadge } from './StatusBadge';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';

function getOverallStatus(event: SocialEvent) {
  const statuses = event.participants.map(p => p.status);
  if (statuses.every(s => s === 'confirmed')) return 'confirmed';
  if (statuses.some(s => s === 'confirmed')) return 'maybe';
  return 'suggested';
}

export function EventCard({ event, index = 0 }: { event: SocialEvent; index?: number }) {
  const dayName = event.date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = event.date.getDate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="flex gap-3 rounded-2xl bg-card p-4 shadow-card"
    >
      <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 px-3 py-2 min-w-[52px]">
        <span className="text-xs font-semibold uppercase text-primary">{dayName}</span>
        <span className="text-lg font-bold text-primary">{dayNum}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{event.emoji}</span>
          <span className="font-semibold text-foreground truncate">{event.title}</span>
          <StatusBadge status={getOverallStatus(event)} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>
          {event.location && (
            <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>
          )}
        </div>
        <AvatarGroup friends={event.participants.map(p => p.friend)} />
      </div>
    </motion.div>
  );
}
