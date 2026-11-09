import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { buildNotification, notificationPath, pushAllowed, pushGrouping } from '../_shared/notificationContent.ts';
const schema = z.object({ dispatchId: z.string().uuid() }).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const gatewayKey = Deno.env.get('LOVABLE_API_KEY'); const connectionKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY');
  if (!url || !service || !gatewayKey || !connectionKey) return json({ error: 'Push delivery is not configured' }, 503);
  const admin = createClient(url, service);
  let claimedId: string | undefined;
  let sent: string[] = [];
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid dispatch' }, 400);
    // The random dispatch UUID is a one-use server capability. Outbox has no client grants/policies.
    // Callers cannot choose a recipient, token, notification text or path; all come from persisted state.
    const { data: claims, error: claimError } = await admin.rpc('claim_push_delivery', { _id: parsed.data.dispatchId });
    if (claimError) throw claimError;
    const claim = claims?.[0];
    if (!claim) return json({ skipped: 'not_pending' });
    claimedId = claim.id; sent = claim.sent_token_ids ?? [];
    const { data: item, error: itemError } = await admin.from('activity_feed').select('*').eq('id', claim.activity_id).single();
    if (itemError || !item) throw new Error('Activity unavailable');
    const { data: profile, error: profileError } = await admin.from('profiles').select('push_notifications,push_plans,push_rsvps,push_comments,push_group_chat,push_friends,preferred_language').eq('user_id', item.user_id).single();
    if (profileError) throw profileError;
    const { data: blocks, error: blockError } = item.source_user_id ? await admin.from('user_blocks').select('id').eq('blocker_id', item.user_id).eq('blocked_user_id', item.source_user_id) : { data: [], error: null };
    if (blockError) throw blockError;
    if (!pushAllowed(profile, item.type, !!blocks?.length)) {
      await admin.from('push_outbox').update({ status: 'skipped', last_error: null }).eq('id', claim.id);
      return json({ skipped: 'preference_or_block' });
    }
    const { data: tokens, error: tokenError } = await admin.from('user_push_tokens').select('id,token,platform').eq('user_id', item.user_id);
    if (tokenError) throw tokenError;
    const actorProfile = item.source_user_id ? (await admin.from("profiles").select("username, display_name").eq("user_id", item.source_user_id).maybeSingle()).data : null;
    const actor = actorProfile ? (actorProfile.display_name?.trim() || actorProfile.username) : undefined;
    const event = item.event_id ? (await admin.from('events').select('title').eq('id', item.event_id).maybeSingle()).data?.title : undefined;
    const group = item.group_id ? (await admin.from('groups').select('name').eq('id', item.group_id).maybeSingle()).data?.name : undefined;
    const notification = buildNotification(item.type, actor, event, group, profile?.preferred_language);
    const grouping = pushGrouping(item);
    for (const device of tokens ?? []) {
      if (sent.includes(device.id)) continue;
      const response = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
        method: 'POST', headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token: device.token, notification,
          data: { path: notificationPath(item), activityId: item.id, recipientId: item.user_id },
          apns: { headers: { 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-collapse-id': grouping.collapseId }, payload: { aps: { sound: 'default', 'thread-id': grouping.threadId } } },
          android: { notification: { tag: grouping.androidTag }, ttl: '86400s' },
        } }),
      });
      if (!response.ok) {
        const details = await response.text();
        // Never log device tokens, which can be repeated in provider error messages.
        if ((response.status === 404 && details.includes('UNREGISTERED')) || (response.status === 400 && details.includes('registration token'))) {
          await admin.from('user_push_tokens').delete().eq('id', device.id);
          sent.push(device.id); continue;
        }
        let fcmCode = 'UNKNOWN'; let fcmMessage = details.slice(0, 300);
        try {
          const parsed = JSON.parse(details);
          const err = parsed?.error ?? {};
          const fcmDetail = Array.isArray(err.details) ? err.details.find((d: { errorCode?: string }) => d?.errorCode) : undefined;
          fcmCode = fcmDetail?.errorCode ?? err.status ?? parsed?.type ?? 'UNKNOWN';
          fcmMessage = String(err.message ?? parsed?.message ?? fcmMessage);
        } catch { /* non-JSON body */ }
        const safeError = `${response.status} ${fcmCode}: ${fcmMessage.split(device.token).join('[token]')}`.slice(0, 500);
        console.error(`FCM send failed for outbox ${claim.id}: ${safeError}`);
        await admin.from('push_outbox').update({ status: 'failed', sent_token_ids: sent, attempts: response.status === 429 || response.status >= 500 ? claim.attempts : 6, retry_at: new Date(Date.now() + 3600000).toISOString(), last_error: safeError }).eq('id', claim.id);
        return json({ error: 'Firebase delivery failed', status: response.status }, response.status);
      }
      sent.push(device.id);
      const { error: saveError } = await admin.from('push_outbox').update({ sent_token_ids: sent }).eq('id', claim.id);
      if (saveError) throw saveError;
    }
    await admin.from('push_outbox').update({ status: tokens?.length ? 'sent' : 'skipped', sent_token_ids: sent, last_error: null }).eq('id', claim.id);
    return json({ ok: true });
  } catch {
    if (claimedId) await admin.from('push_outbox').update({ status: 'failed', sent_token_ids: sent, retry_at: new Date(Date.now() + 3600000).toISOString(), last_error: 'Delivery interrupted' }).eq('id', claimedId);
    return json({ error: 'Push delivery failed' }, 500);
  }
});