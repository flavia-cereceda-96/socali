import { events, feedInsights } from '@/data/mockData';
import { EventCard } from '@/components/EventCard';
import { FeedCard } from '@/components/FeedCard';
import { motion } from 'framer-motion';

const Index = () => {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 18) return 'Good afternoon 👋';
    return 'Good evening 🌙';
  })();

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

        {/* Feed Insights */}
        <div className="mb-6 flex flex-col gap-2">
          {feedInsights.map((insight, i) => (
            <FeedCard key={i} type={insight.type} text={insight.text} index={i} />
          ))}
        </div>

        {/* Upcoming Events */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Upcoming Plans
        </motion.h2>
        <div className="flex flex-col gap-3">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
