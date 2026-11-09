import { cn } from '@/lib/utils';
import { avatarColorVar } from '@/lib/avatarRules';

interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string;
  /** When given, the no-photo fallback uses a deterministic sticker colour. */
  userId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-20 w-20 text-3xl',
};

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function UserAvatar({ avatarUrl, username, userId, size = 'md', className }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username || 'User'}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }

  if (userId) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-full font-semibold text-foreground', sizeClasses[size], className)}
        style={{ backgroundColor: `hsl(var(${avatarColorVar(userId)}))` }}
        aria-label={username || 'User'}
      >
        {initials(username)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-secondary font-semibold text-muted-foreground',
        sizeClasses[size],
        className
      )}
    >
      {username ? username[0].toUpperCase() : '?'}
    </div>
  );
}
