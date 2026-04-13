import { events } from '@/data/mockData';
import { EventCard } from '@/components/EventCard';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react';

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
  const confirmedCount = weekEvents.filter(e => e.participants.every(p => p.status === 'confirmed')).length;
  const pendingCount = weekEvents.length - confirmedCount;

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

        {/* Scorecard */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 rounded-2xl bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-foreground">{weekEvents.length} plan{weekEvents.length !== 1 ? 's' : ''} this week</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              {confirmedCount} confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              {pendingCount} pending
            </span>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Upcoming Plans
        </motion.h2>
        <div className="flex flex-col gap-3">
          {weekEvents.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
