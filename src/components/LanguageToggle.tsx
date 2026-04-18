import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useLanguage } from '@/hooks/useLanguagePreference';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'card' | 'inline';
}

/**
 * Pill-style language picker. Default 'card' renders larger tiles,
 * 'inline' renders compact buttons suitable for settings rows.
 */
export function LanguageToggle({ variant = 'card' }: LanguageToggleProps) {
  const { current, change, isChanging } = useLanguage();

  if (variant === 'inline') {
    return (
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {SUPPORTED_LANGUAGES.map(lang => {
          const active = current === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              disabled={isChanging}
              onClick={() => change(lang.code)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {SUPPORTED_LANGUAGES.map(lang => {
        const active = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            disabled={isChanging}
            onClick={() => change(lang.code)}
            className={cn(
              'flex items-center justify-between rounded-2xl border-2 bg-card px-4 py-3.5 text-left transition-all',
              active
                ? 'border-primary bg-primary/5 shadow-card'
                : 'border-border hover:border-primary/40'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-base font-semibold text-foreground">{lang.label}</span>
            </div>
            {active && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
