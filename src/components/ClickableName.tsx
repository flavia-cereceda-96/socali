import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClickableNameProps {
  userId: string;
  name: string;
  className?: string;
}

export function ClickableName({ userId, name, className }: ClickableNameProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/person/${userId}`);
      }}
      className={cn(
        'font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left',
        className
      )}
    >
      {name}
    </button>
  );
}
