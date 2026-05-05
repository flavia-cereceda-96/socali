import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface FloatingActionButtonProps {
  to?: string;
  ariaLabel?: string;
}

export function FloatingActionButton({ to = '/create', ariaLabel = 'Create event' }: FloatingActionButtonProps) {
  const navigate = useNavigate();
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.04 }}
      onClick={() => navigate(to)}
      aria-label={ariaLabel}
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-elevated"
      style={{
        backgroundColor: '#FFB8C6',
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
      }}
    >
      <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
    </motion.button>
  );
}