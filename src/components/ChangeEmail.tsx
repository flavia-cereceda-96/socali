import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authOrigin } from '@/lib/appUrl';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ChangeEmail() {
  const [current, setCurrent] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [next, setNext] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrent(user?.email ?? '');
      setPending((user as any)?.new_email ?? null);
    });
  }, []);

  const submit = async () => {
    const email = next.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return toast.error('Enter a valid email address');
    if (email === current.toLowerCase()) return toast.error('That’s already your email');
    setSaving(true);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${authOrigin()}/settings` },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    setPending(email);
    setOpen(false);
    setNext('');
    toast.success('Check your inbox to confirm the change');
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Login email</h2>
      </div>
      <p className="text-sm text-muted-foreground break-all">{current}</p>
      {pending && (
        <p className="rounded-xl bg-secondary/60 p-3 text-xs text-foreground">
          Waiting for confirmation of <strong className="break-all">{pending}</strong>. Click the links we emailed to finish — your current email keeps working until then.
        </p>
      )}
      {open ? (
        <div className="space-y-2">
          <Input type="email" autoComplete="email" placeholder="New email address" value={next}
            onChange={e => setNext(e.target.value)} maxLength={255} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={saving}>
              {saving ? 'Sending…' : 'Send confirmation'}
            </Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setNext(''); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>Change email</Button>
      )}
    </section>
  );
}
