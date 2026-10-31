import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ModerationPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: admin, isLoading } = useQuery({ queryKey: ['is-admin'], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (error) throw error;
    return data;
  } });
  const { data: reports = [], error } = useQuery({ queryKey: ['moderation-reports'], enabled: admin === true, queryFn: async () => {
    const { data, error } = await supabase.from('user_reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } });
  const review = async (id: string, action: 'dismissed' | 'removed') => {
    setBusy(id);
    try { const { error } = await supabase.rpc('review_user_report', { _report_id: id, _action: action }); if (error) throw error; await qc.invalidateQueries(); toast.success('Report reviewed'); }
    catch { toast.error('Could not review report'); }
    finally { setBusy(null); }
  };
  return <main className="mx-auto max-w-2xl px-4 py-8 pb-32"><Link className="text-sm text-secondary-foreground underline" to="/settings">Settings</Link><h1 className="my-6 text-2xl font-bold">Safety reports</h1>
    {isLoading ? <p>Loading…</p> : !admin ? <p>Admin access required.</p> : error ? <p>Reports could not be loaded.</p> : reports.length === 0 ? <p className="text-muted-foreground">No reports.</p> : <div className="space-y-5">{reports.map(r => <article className="border-b border-border pb-5" key={r.id}><div className="flex justify-between gap-2"><h2 className="font-semibold">{r.content_type.replaceAll('_',' ')} · {r.reason}</h2><span className="text-xs text-muted-foreground">{r.status}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{r.content_preview}</p>{r.details && <p className="mt-2 text-sm text-muted-foreground">{r.details}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>{r.status === 'open' && <div className="mt-3 flex gap-2"><Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => review(r.id,'removed')}>Hide content</Button><Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r.id,'dismissed')}>Dismiss report</Button></div>}</article>)}</div>}
  </main>;
}