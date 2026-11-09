import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarHeart } from 'lucide-react';

interface HomeEmptyStateProps {
  usage?: string | null;
}

function getCopy(usage?: string | null) {
  switch (usage) {
    case 'partner':
      return {
        heading: 'Plan your next date night 🌙',
        subheading: 'Start by adding your partner, then create something to look forward to together.',
        primary: { label: 'Add your partner', to: '/people' },
        secondary: { label: 'Create a Plan', to: '/create' },
      };
    case 'friends':
      return {
        heading: 'Time to get the group together 🎉',
        subheading: 'Start by finding your friends, then plan your first hangout together.',
        primary: { label: 'Find your friends', to: '/people' },
        secondary: { label: 'Create a Plan', to: '/create' },
      };
    case 'own':
      return {
        heading: 'Your personal planning space 📋',
        subheading: 'Keep your schedule in one place — start by adding your first plan.',
        primary: { label: 'Create your first plan', to: '/create' },
        secondary: null as null | { label: string; to: string },
      };
    default:
      return {
        heading: "You're all set up!",
        subheading: 'Start by adding a friend, then create your first plan together.',
        primary: { label: 'Find Friends', to: '/people' },
        secondary: { label: 'Create a Plan', to: '/create' },
      };
  }
}

export function HomeEmptyState({ usage }: HomeEmptyStateProps) {
  const navigate = useNavigate();
  const copy = getCopy(usage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl bg-card p-7 shadow-card text-center"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <CalendarHeart className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1.5">{copy.heading}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-[260px] mx-auto">
        {copy.subheading}
      </p>
      <div className="flex flex-col gap-2.5">
        <Button onClick={() => navigate(copy.primary.to)} size="lg" className="w-full font-semibold">
          {copy.primary.label}
        </Button>
        {copy.secondary && (
          <Button
            onClick={() => navigate(copy.secondary!.to)}
            size="lg"
            variant="outline"
            className="w-full font-semibold"
          >
            {copy.secondary.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
