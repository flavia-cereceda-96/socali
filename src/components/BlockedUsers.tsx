import { useBlocks, useSafetyActions } from '@/hooks/useSafety';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function BlockedUsers() {
  const { data: blocks = [] } = useBlocks();
  const { unblock } = useSafetyActions();
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  return <section className="space-y-3"><h2 className="text-sm font-semibold">{es ? 'Usuarios bloqueados' : 'Blocked users'}</h2>
    {blocks.length === 0 ? <p className="text-xs text-muted-foreground">{es ? 'No has bloqueado a nadie.' : 'No blocked users.'}</p> : blocks.map((b, index) => <div key={b.id} className="flex items-center justify-between border-b border-border py-2 gap-3"><span className="text-sm">{es ? 'Usuario bloqueado' : 'Blocked user'} {index + 1}<span className="block text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span></span><Button size="sm" variant="outline" onClick={async () => { try { await unblock(b.id); toast.success(es ? 'Usuario desbloqueado' : 'User unblocked'); } catch { toast.error(es ? 'No se pudo desbloquear' : 'Could not unblock'); } }}>{es ? 'Desbloquear' : 'Unblock'}</Button></div>)}
  </section>;
}