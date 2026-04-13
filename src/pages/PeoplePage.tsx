import { friends, events } from '@/data/mockData';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function getLastEventWith(friendId: string) {
  const today = new Date();
  const past = events
    .filter(e => e.participants.some(p => p.friend.id === friendId) && e.date <= today)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return past[0];
}

function getUpcomingWith(friendId: string) {
  const today = new Date();
  return events.filter(e => e.participants.some(p => p.friend.id === friendId) && e.date >= today).length;
}

const PeoplePage = () => {
  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-2xl font-bold text-foreground"
        >
          Your People
        </motion.h1>

        <div className="flex flex-col gap-3">
          {friends.map((friend, i) => {
            const upcoming = getUpcomingWith(friend.id);
            const last = getLastEventWith(friend.id);

            return (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xl">
                  {friend.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{friend.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {upcoming > 0
                      ? `${upcoming} upcoming plan${upcoming > 1 ? 's' : ''}`
                      : last
                        ? `Last: ${last.title} ${last.emoji}`
                        : 'No plans yet'}
                  </p>
                </div>
                <button className={cn(
                  'rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary',
                  'transition-colors hover:bg-primary/20 active:scale-95'
                )}>
                  Plan 🗓️
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PeoplePage;
