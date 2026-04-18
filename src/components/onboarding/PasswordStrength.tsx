import { cn } from '@/lib/utils';

export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'strong';

export const getPasswordStrength = (password: string): StrengthLevel => {
  if (!password) return 'empty';
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score <= 3) return 'fair';
  return 'strong';
};

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = getPasswordStrength(password);
  if (strength === 'empty') return null;

  const config = {
    weak: { label: 'Weak', color: 'bg-destructive', text: 'text-destructive', segments: 1 },
    fair: { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-500', segments: 2 },
    strong: { label: 'Strong', color: 'bg-green-500', text: 'text-green-600 dark:text-green-500', segments: 3 },
  }[strength];

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < config.segments ? config.color : 'bg-border'
            )}
          />
        ))}
      </div>
      <span className={cn('text-[10px] font-medium', config.text)}>{config.label}</span>
    </div>
  );
};
