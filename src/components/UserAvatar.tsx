import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-20 w-20 text-3xl',
};

export function UserAvatar({ avatarUrl, username, size = 'md', className }: UserAvatarProps) {
  const initial = username ? username[0].toUpperCase() : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username || 'User'}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
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
      {initial}
    </div>
  );
}
