import { EventStatus } from '@/data/mockData';
import { cn } from '@/lib/utils';

const statusConfig: Record<EventStatus, { label: string; icon: string; className: string }> = {
  suggested: { label: 'Suggested', icon: '👀', className: 'bg-status-suggested/15 text-status-suggested' },
  maybe: { label: 'Maybe', icon: '🤔', className: 'bg-status-maybe/15 text-status-maybe' },
  confirmed: { label: 'Confirmed', icon: '✅', className: 'bg-status-confirmed/15 text-status-confirmed' },
  declined: { label: 'Declined', icon: '❌', className: 'bg-status-declined/15 text-status-declined' },
};

export function StatusBadge({ status, size = 'sm' }: { status: EventStatus; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      config.className
    )}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
