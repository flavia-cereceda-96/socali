import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Attendee, goingSummary, orderAttendees, avatarColorVar } from '@/lib/avatarRules';

export type { Attendee } from '@/lib/avatarRules';

interface AvatarGroupProps {
  people: Attendee[];
  size?: 'lg' | 'sm';
  viewerIsOrganiser?: boolean;
  friendRank?: Record<string, number>;
  showSummary?: boolean;
  title?: string;
  className?: string;
  summaryClassName?: string;
}

const MAX = 3;

function Face({ person, size }: { person: Attendee; size: 'lg' | 'sm' }) {
  const px = size === 'lg' ? 32 : 24;
  const going = person.status === 'confirmed';
  const invited = !going && person.status !== 'maybe';
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 rounded-full ring-2 ring-card',
        invited && 'border border-dashed border-muted-foreground',
      )}
      style={{
        width: px,
        height: px,
        boxShadow: going && size === 'lg' ? '0 0 0 4px hsl(var(--accent))' : undefined,
        opacity: invited ? 0.55 : undefined,
      }}
    >
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt={person.name} className="h-full w-full rounded-full object-cover" loading="lazy" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-foreground"
          style={{ backgroundColor: `hsl(var(${avatarColorVar(person.id)}))`, fontSize: size === 'lg' ? 12 : 10 }}
        >
          {(person.name || '?').slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function AvatarGroup({
  people,
  size = 'sm',
  viewerIsOrganiser = false,
  friendRank,
  showSummary = false,
  title = "Who's coming",
  className,
  summaryClassName,
}: AvatarGroupProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const visible = orderAttendees(people, { viewerIsOrganiser, friendRank });
  if (visible.length === 0) return null;
  const shown = visible.slice(0, MAX);
  const extra = visible.length - shown.length;
  const px = size === 'lg' ? 32 : 24;
  const summary = showSummary ? goingSummary(people, friendRank) : '';

  const sections = [
    { label: 'Going', items: visible.filter((p) => p.status === 'confirmed') },
    { label: 'Maybe', items: visible.filter((p) => p.status === 'maybe') },
    { label: 'Invited', items: visible.filter((p) => p.status !== 'confirmed' && p.status !== 'maybe') },
  ].filter((s) => s.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={cn('flex items-center gap-2 text-left', className)}
        aria-label={`See who's coming (${visible.length})`}
      >
        <span className="flex items-center" style={{ paddingLeft: 8 }}>
          {shown.map((p) => (
            <span key={p.id} style={{ marginLeft: -8 }}>
              <Face person={p} size={size} />
            </span>
          ))}
          {extra > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-card"
              style={{ marginLeft: -8, height: px, minWidth: px, paddingInline: 4, fontSize: size === 'lg' ? 11 : 10 }}
            >
              +{extra}
            </span>
          )}
        </span>
        {summary && <span className={cn('truncate text-xs text-muted-foreground', summaryClassName)}>{summary}</span>}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent onClick={(e) => e.stopPropagation()}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {sections.map((s) => (
              <div key={s.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label} · {s.items.length}
                </p>
                <ul className="space-y-1">
                  {s.items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => { setOpen(false); navigate(`/person/${p.id}`); }}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
                      >
                        <UserAvatar avatarUrl={p.avatarUrl} username={p.name} userId={p.id} size="md" />
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
