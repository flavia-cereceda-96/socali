import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AccountDeletion() {
  const [step, setStep] = useState(0);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const remove = async () => {
    if (confirmation !== 'DELETE') return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirmation } });
      if (error || data?.deleted !== true) throw new Error('Deletion failed');
      await supabase.auth.signOut({ scope: 'local' });
      qc.clear();
      try {
        for (const storage of [localStorage, sessionStorage]) {
          for (const key of Object.keys(storage)) {
            if (/^(sb-|synccircle|socali|cali|pending|feedback_)/i.test(key)) storage.removeItem(key);
          }
        }
      } catch { /* Browser storage can be disabled. */ }
      navigate('/welcome', { replace: true });
    } catch { toast.error(es ? 'No se pudo eliminar la cuenta. Inténtalo otra vez o contacta con ayuda.' : 'Deletion could not be completed. Please retry or contact support.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 border-t border-border pt-6">
    <Button variant="destructive" className="w-full gap-2" onClick={() => { setConfirmation(''); setStep(1); }}><Trash2 className="h-4 w-4" />{es ? 'Eliminar cuenta' : 'Delete account'}</Button>
    <AlertDialog open={step > 0} onOpenChange={open => { if (!open && !busy) setStep(0); }}><AlertDialogContent className="max-h-[85dvh] overflow-y-auto"><AlertDialogHeader><AlertDialogTitle>{es ? 'Eliminar tu cuenta permanentemente' : 'Permanently delete your account'}</AlertDialogTitle><AlertDialogDescription>{es ? 'Se eliminarán tu perfil, fotos, mensajes, comentarios, conexiones y los eventos y grupos que creaste, también para sus miembros. Esta acción no se puede deshacer.' : 'Your profile, photos, messages, comments, connections, and the events and groups you created will be deleted, including for their members. This cannot be undone.'}</AlertDialogDescription></AlertDialogHeader>
      {step === 2 && <Input aria-label="Type DELETE to confirm" autoComplete="off" placeholder={es ? 'Escribe DELETE para confirmar' : 'Type DELETE to confirm'} value={confirmation} onChange={e => setConfirmation(e.target.value)} />}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>{es ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>{step === 1 ? <Button variant="destructive" onClick={() => setStep(2)}>{es ? 'Continuar' : 'Continue'}</Button> : <Button variant="destructive" disabled={busy || confirmation !== 'DELETE'} onClick={remove}>{busy ? (es ? 'Eliminando…' : 'Deleting…') : (es ? 'Eliminar permanentemente' : 'Delete permanently')}</Button>}</AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </section>;
}