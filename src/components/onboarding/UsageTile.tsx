import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageTileProps {
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export const UsageTile = ({ emoji, label, description, selected, onClick }: UsageTileProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-border bg-card hover:bg-secondary/60'
      )}
    >
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-semibold', selected ? 'text-foreground' : 'text-foreground')}>
          {label}
        </div>
        <div className="text-xs text-muted-foreground leading-snug">{description}</div>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
};
