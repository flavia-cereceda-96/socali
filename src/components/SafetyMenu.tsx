import { useState } from 'react';
import { Flag, MoreHorizontal, ShieldBan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyActions } from '@/hooks/useSafety';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type ContentType = 'profile' | 'event_comment' | 'group_message' | 'event_photo' | 'event' | 'group' | 'feedback' | 'feedback_comment' | 'bucket_item' | 'what_option';

export function SafetyMenu({ type, contentId, authorId, currentUserId, hideTrigger, open, onOpenChange }: { type: ContentType; contentId: string; authorId: string; currentUserId: string | null; hideTrigger?: boolean; open?: 'report' | 'block' | null; onOpenChange?: (v: 'report' | 'block' | null) => void }) {
  const [reportOpenState, setReportOpenState] = useState(false);
  const [blockOpenState, setBlockOpenState] = useState(false);
  const controlled = onOpenChange !== undefined;
  const reportOpen = controlled ? open === 'report' : reportOpenState;
  const blockOpen = controlled ? open === 'block' : blockOpenState;
  const setReportOpen = (v: boolean) => controlled ? onOpenChange!(v ? 'report' : null) : setReportOpenState(v);
  const setBlockOpen = (v: boolean) => controlled ? onOpenChange!(v ? 'block' : null) : setBlockOpenState(v);
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const { block, refresh } = useSafetyActions();
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  if (!currentUserId || authorId === currentUserId) return null;
  const sendReport = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from('user_reports').insert({ reporter_id: currentUserId, reported_user_id: authorId, content_type: type, content_id: contentId, reason, details: details.trim() });
      if (error) throw error;
      setReportOpen(false);
      toast.success(es ? 'Reporte enviado. Contenido ocultado.' : 'Report sent. Content hidden from your view.');
      await refresh();
    } catch { toast.error(es ? 'No se pudo enviar el reporte' : 'Could not submit report'); }
    finally { setBusy(false); }
  };
  const confirmBlock = async () => {
    setBusy(true);
    try { await block(authorId); setBlockOpen(false); toast.success(es ? 'Usuario bloqueado' : 'User blocked'); }
    catch { toast.error(es ? 'No se pudo bloquear' : 'Could not block user'); }
    finally { setBusy(false); }
  };
  return <div onClick={e => e.stopPropagation()} className="shrink-0">
    {!hideTrigger && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={es ? 'Reportar o bloquear' : 'Report or block'}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setReportOpen(true)}><Flag className="mr-2 h-4 w-4" />{es ? 'Reportar contenido' : 'Report content'}</DropdownMenuItem><DropdownMenuItem onSelect={() => setBlockOpen(true)}><ShieldBan className="mr-2 h-4 w-4" />{es ? 'Bloquear usuario' : 'Block user'}</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>}
    <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{es ? 'Reportar contenido' : 'Report content'}</DialogTitle><DialogDescription>{es ? 'El equipo revisará tu reporte. No se comparte tu identidad con el autor.' : 'Your report goes to the review team. Your identity is not shared with the author.'}</DialogDescription></DialogHeader>
      <Select value={reason} onValueChange={setReason}><SelectTrigger aria-label={es ? 'Motivo' : 'Reason'}><SelectValue /></SelectTrigger><SelectContent>{[['harassment', es ? 'Acoso' : 'Harassment'], ['inappropriate', es ? 'Contenido inapropiado' : 'Inappropriate content'], ['spam', 'Spam'], ['other', es ? 'Otro' : 'Other']].map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
      <Textarea aria-label={es ? 'Detalles' : 'Details'} placeholder={es ? 'Detalles opcionales' : 'Optional details'} maxLength={1000} value={details} onChange={e => setDetails(e.target.value)} />
      <Button disabled={busy} onClick={sendReport}>{es ? 'Enviar reporte' : 'Submit report'}</Button>
    </DialogContent></Dialog>
    <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{es ? '¿Bloquear usuario?' : 'Block this user?'}</AlertDialogTitle><AlertDialogDescription>{es ? 'Su perfil y contenido dejarán de aparecer. Puedes desbloquearlo en Ajustes.' : 'Their profile and content will be hidden from you. You can unblock them in Settings.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>{es ? 'Cancelar' : 'Cancel'}</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={confirmBlock}>{es ? 'Bloquear' : 'Block user'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}