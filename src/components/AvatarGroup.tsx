import { Friend } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function AvatarGroup({ friends, max = 4 }: { friends: Friend[]; max?: number }) {
  const shown = friends.slice(0, max);
  const extra = friends.length - max;

  return (
    <div className="flex -space-x-2">
      {shown.map((f) => (
        <div
          key={f.id}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-sm',
            'ring-0'
          )}
          title={f.name}
        >
          {f.emoji}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  );
}
