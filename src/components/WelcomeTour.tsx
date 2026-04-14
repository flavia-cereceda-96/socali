import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Users, Plus, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOUR_KEY = 'synccircle_ftux_done';

const steps = [
  {
    icon: <span className="text-4xl">🎉</span>,
    title: 'Welcome to SyncCircle!',
    description: 'Your social planning hub — let\'s take a quick tour of how things work.',
  },
  {
    icon: <CalendarDays className="h-10 w-10 text-primary" />,
    title: 'Your Calendar',
    description: 'See all your plans at a glance. Scroll through weeks, check friend availability with @mentions, and tap any day to see details.',
  },
  {
    icon: <Plus className="h-10 w-10 text-primary" />,
    title: 'Create Events',
    description: 'Plan hangouts, trips, or dinners. Add friends with @search, set dates and times, and even add a cover image.',
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: 'Your People',
    description: 'Add friends by searching their username. See how many events you\'ve shared and invite new people to join.',
  },
  {
    icon: <Bell className="h-10 w-10 text-primary" />,
    title: 'Stay in the Loop',
    description: 'Get notified about event invites, comments, and RSVPs. Accept or decline right from your activity feed.',
  },
];

interface WelcomeTourProps {
  onComplete?: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      setVisible(true);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setVisible(false);
    onComplete?.();
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finish();
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      >
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-sm rounded-3xl bg-card p-8 shadow-xl text-center"
        >
          {/* Skip button */}
          <button
            onClick={finish}
            className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="mb-5 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Action */}
          <Button onClick={next} className="w-full font-semibold" size="lg">
            {isLast ? 'Get Started! 🚀' : 'Next'}
          </Button>

          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
