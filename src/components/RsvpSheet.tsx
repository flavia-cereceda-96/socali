import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type RsvpValue = 'confirmed' | 'declined' | 'pending';

const OPTIONS: { value: RsvpValue; label: string; icon: string }[] = [
  { value: 'confirmed', label: 'Confirmed', icon: '✅' },
  { value: 'declined', label: "Can't make it", icon: '❌' },
  { value: 'pending', label: 'Pending', icon: '👀' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: RsvpValue;
  onSave: (value: RsvpValue) => void | Promise<void>;
  saving?: boolean;
}

export function RsvpSheet({ open, onOpenChange, current, onSave, saving }: Props) {
  const [selected, setSelected] = useState<RsvpValue>(current);

  useEffect(() => {
    if (open) setSelected(current);
  }, [open, current]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6">
        <SheetHeader>
          <SheetTitle>Update your RSVP</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          {OPTIONS.map(opt => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-secondary/50',
                )}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className={cn('flex-1 font-medium', active ? 'text-primary' : 'text-foreground')}>
                  {opt.label}
                </span>
                {active && <span className="text-xs font-semibold text-primary">Selected</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => onSave(selected)}
            disabled={saving || selected === current}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}