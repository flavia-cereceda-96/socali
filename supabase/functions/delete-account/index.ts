import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const bodySchema = z.object({ confirmation: z.literal('DELETE') }).strict();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key || !anon) return json({ error: 'Account deletion is unavailable' }, 503);
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401);
    const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return json({ error: 'Sign in required' }, 401);
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Explicit deletion confirmation required' }, 400);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const check = <T,>(result: { data: T; error: unknown }) => {
      if (result.error) throw new Error('Deletion could not be completed. Please retry or contact support.');
      return result.data;
    };
    const events = check(await admin.from('events').select('id').eq('created_by', user.id)) || [];
    const groups = check(await admin.from('groups').select('id').eq('created_by', user.id)) || [];
    const ownPhotos = check(await admin.from('event_photos').select('storage_path').eq('user_id', user.id)) || [];
    const eventPhotos = events.length ? check(await admin.from('event_photos').select('storage_path').in('event_id', events.map(e => e.id))) || [] : [];
    async function removeFolder(bucket: string, prefix: string) {
      // Remove each page before listing again, so offsets cannot skip deleted objects.
      for (;;) {
        const files = check(await admin.storage.from(bucket).list(prefix, { limit: 100 })) || [];
        if (!files.length) return;
        const objects: string[] = [];
        for (const file of files) {
          const path = `${prefix}/${file.name}`;
          if (file.id) objects.push(path);
          else await removeFolder(bucket, path);
        }
        if (objects.length) check(await admin.storage.from(bucket).remove(objects));
      }
    }
    await removeFolder('avatars', user.id);
    await removeFolder('event-photos', user.id);
    const paths = [...new Set([...ownPhotos, ...eventPhotos].map(p => p.storage_path))];
    for (let i = 0; i < paths.length; i += 100) check(await admin.storage.from('event-photos').remove(paths.slice(i, i + 100)));
    for (const group of groups) await removeFolder('group-avatars', group.id);
    check(await admin.rpc('purge_account_data', { _user_id: user.id }));
    check(await admin.auth.admin.deleteUser(user.id));
    return json({ deleted: true });
  } catch {
    return json({ error: 'Deletion could not be completed. Please retry or contact support.' }, 500);
  }
});