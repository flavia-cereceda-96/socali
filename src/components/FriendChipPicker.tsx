import { useState } from 'react';
import { DbProfile } from '@/hooks/useEvents';
import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface Props {
  friends: DbProfile[];
  selected: DbProfile[];
  onChange: (next: DbProfile[]) => void;
  placeholder?: string;
  emptyText?: string;
}

/**
 * Reusable friend search + chip selector.
 * Mirrors the @-mention selector used in event creation.
 */
export function FriendChipPicker({
  friends,
  selected,
  onChange,
  placeholder = '@username to search friends...',
  emptyText = 'No matching friends found',
}: Props) {
  const [query, setQuery] = useState('');

  const toggle = (f: DbProfile) => {
    onChange(
      selected.find(s => s.user_id === f.user_id)
        ? selected.filter(s => s.user_id !== f.user_id)
        : [...selected, f]
    );
  };

  const q = query.startsWith('@') ? query.slice(1).toLowerCase() : query.toLowerCase();
  const filtered = query.length > 0
    ? friends.filter(f =>
        !selected.find(s => s.user_id === f.user_id) &&
        (f.username.toLowerCase().includes(q) || (f.email || '').toLowerCase().includes(q))
      )
    : [];

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(f => (
            <span
              key={f.user_id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary"
            >
              <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="sm" />
              @{f.username}
              <button type="button" onClick={() => toggle(f)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {query.length > 0 && (
        filtered.length > 0 ? (
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1">
            {filtered.map(f => (
              <button
                key={f.user_id}
                type="button"
                onClick={() => { toggle(f); setQuery(''); }}
                className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-secondary/50"
              >
                <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">@{f.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        )
      )}
    </div>
  );
}
