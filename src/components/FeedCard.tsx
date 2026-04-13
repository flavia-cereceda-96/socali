import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FeedCardProps {
  type: 'nudge' | 'free' | 'invite';
  text: string;
  index?: number;
}

const typeStyles = {
  nudge: 'bg-surface-warm border-l-4 border-l-status-suggested',
  free: 'bg-status-confirmed/10 border-l-4 border-l-status-confirmed',
  invite: 'bg-primary/5 border-l-4 border-l-primary',
};

export function FeedCard({ type, text, index = 0 }: FeedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.3 }}
      className={cn('rounded-xl px-4 py-3 text-sm font-medium text-foreground', typeStyles[type])}
    >
      {text}
    </motion.div>
  );
}
