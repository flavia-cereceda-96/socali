import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
const schema = z.object({ token: z.string().min(20).max(4096), platform: z.enum(['ios','android']), remove: z.boolean().optional() }).strict();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key || !anon) return json({ error: 'Push unavailable' }, 503);
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401);
    const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await auth.auth.getUser();
    if (error || !user) return json({ error: 'Sign in required' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid device registration' }, 400);
    const admin = createClient(url, key);
    if (parsed.data.remove) {
      const result = await admin.from('user_push_tokens').delete().eq('token', parsed.data.token).eq('user_id', user.id);
      if (result.error) throw result.error;
    } else {
      const { data: profile, error: profileError } = await admin.from('profiles').select('push_notifications').eq('user_id', user.id).single();
      if (profileError || profile?.push_notifications !== true) return json({ error: 'Enable push notifications first' }, 403);
      const result = await admin.from('user_push_tokens').upsert({ user_id: user.id, token: parsed.data.token, platform: parsed.data.platform, updated_at: new Date().toISOString() }, { onConflict: 'token' });
      if (result.error) throw result.error;
    }
    return json({ ok: true });
  } catch { return json({ error: 'Device registration failed' }, 500); }
});