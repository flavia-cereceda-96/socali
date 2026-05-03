import { cn } from '@/lib/utils';

interface GroupAvatarProps {
  avatarUrl?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-base',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-20 w-20 text-3xl',
};

export function GroupAvatar({ avatarUrl, emoji, name, size = 'md', className }: GroupAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Group'}
        className={cn('rounded-full object-cover bg-secondary', sizeClasses[size], className)}
      />
    );
  }

  if (emoji) {
    return (
      <div
        className={cn(
          'flex flex-shrink-0 items-center justify-center rounded-full bg-primary/10',
          sizeClasses[size],
          className
        )}
      >
        {emoji}
      </div>
    );
  }

  const initials = (name || '?')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-muted-foreground',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
