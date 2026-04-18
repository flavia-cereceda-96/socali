import { useEffect, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface CoachMarkProps {
  id: string;
  text: string;
  anchorRef: RefObject<HTMLElement>;
  placement?: 'top' | 'bottom';
  delay?: number;
}

export function CoachMark({ id, text, anchorRef, placement = 'top', delay = 600 }: CoachMarkProps) {
  const storageKey = `coach_${id}_seen`;
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === 'true'; } catch {}
    if (seen) return;

    const t = setTimeout(() => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: placement === 'top' ? rect.top + window.scrollY : rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
        width: rect.width,
      });
      setVisible(true);
    }, delay);
    return () => clearTimeout(t);
  }, [anchorRef, placement, delay, storageKey]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, 'true'); } catch {}
    setVisible(false);
  };

  if (!visible || !pos) return null;

  const offset = 12;
  const style: React.CSSProperties =
    placement === 'top'
      ? { top: pos.top - offset, left: pos.left, transform: 'translate(-50%, -100%)' }
      : { top: pos.bottom + offset, left: pos.left, transform: 'translate(-50%, 0)' };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="fixed z-[60] pointer-events-auto"
        style={style}
      >
        <div className="relative flex items-start gap-2 rounded-2xl bg-foreground px-3.5 py-2.5 text-background shadow-xl max-w-[240px]">
          <p className="text-xs font-medium leading-snug pr-1">{text}</p>
          <button
            onClick={dismiss}
            className="shrink-0 -mr-1 rounded-full p-0.5 hover:bg-background/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-foreground ${
              placement === 'top' ? '-bottom-1' : '-top-1'
            }`}
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
