import { Friend } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function AvatarGroup({ friends, max = 4, size = 'sm' }: { friends: Friend[]; max?: number; size?: 'sm' | 'md' }) {
  const shown = friends.slice(0, max);
  const extra = friends.length - max;
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className="flex -space-x-2">
      {shown.map((f) => (
        <div
          key={f.id}
          className={cn(
            'rounded-full border-2 border-card overflow-hidden',
            dim
          )}
          title={f.name}
        >
          {f.avatar ? (
            <img src={f.avatar} alt={f.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className={cn('flex items-center justify-center bg-secondary text-sm', dim)}>
              {f.emoji}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className={cn('flex items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-muted-foreground', dim)}>
          +{extra}
        </div>
      )}
    </div>
  );
}
