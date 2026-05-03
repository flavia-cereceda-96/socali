import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://socali.lovable.app';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function buildContent(type: string, sourceName: string, eventTitle?: string, commentContent?: string) {
  const actor = sourceName || 'Someone';
  switch (type) {
    case 'invitation':
      return { title: `${actor} invited you to ${eventTitle ?? 'an event'}`, body: `You've been invited to "${eventTitle ?? 'an event'}".` };
    case 'comment':
      return { title: `${actor} commented on ${eventTitle ?? 'an event'}`, body: commentContent ?? 'New comment on your event.' };
    case 'mention':
      return { title: `${actor} mentioned you`, body: commentContent ?? `${actor} mentioned you in a comment.` };
    case 'rsvp_accepted':
      return { title: `${actor} is going to ${eventTitle ?? 'your event'}`, body: `${actor} accepted your invitation.` };
    case 'rsvp_declined':
      return { title: `${actor} can't make it to ${eventTitle ?? 'your event'}`, body: `${actor} declined your invitation.` };
    case 'rsvp_maybe':
      return { title: `${actor} might come to ${eventTitle ?? 'your event'}`, body: `${actor} responded "maybe" to your invitation.` };
    case 'friend_request':
      return { title: `${actor} sent you a friend request`, body: `${actor} wants to connect with you on SyncCircle.` };
    case 'friend_accepted':
      return { title: `${actor} accepted your friend request`, body: `You're now friends with ${actor} on SyncCircle.` };
    default:
      return { title: 'New notification', body: 'You have a new notification on SyncCircle.' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
    const { record } = await req.json();
    if (!record?.user_id || !record?.type) {
      return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Recipient email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('user_id', record.user_id)
      .maybeSingle();

    if (!profile?.email) {
      return new Response(JSON.stringify({ skipped: 'no email' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let sourceName = '';
    if (record.source_user_id) {
      const { data: src } = await supabase.from('profiles').select('username').eq('user_id', record.source_user_id).maybeSingle();
      sourceName = src?.username ?? '';
    }
    let eventTitle: string | undefined;
    if (record.event_id) {
      const { data: ev } = await supabase.from('events').select('title').eq('id', record.event_id).maybeSingle();
      eventTitle = ev?.title;
    }
    let commentContent: string | undefined;
    if (record.comment_id) {
      const { data: c } = await supabase.from('event_comments').select('content').eq('id', record.comment_id).maybeSingle();
      commentContent = c?.content;
    }

    const { title, body } = buildContent(record.type, sourceName, eventTitle, commentContent);
    const link = record.event_id ? `${APP_URL}/event/${record.event_id}` : `${APP_URL}/activity`;

    const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#FAFAFE;padding:24px;color:#1A1230;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid rgba(160,130,255,0.2);">
        <h1 style="font-size:20px;margin:0 0 12px;color:#6B45F5;">${title}</h1>
        <p style="font-size:15px;line-height:1.5;margin:0 0 24px;">${body}</p>
        <a href="${link}" style="display:inline-block;background:#B8A0FF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Open SyncCircle</a>
        <p style="font-size:12px;color:#888;margin:32px 0 0;">You received this email because you have notifications enabled on SyncCircle.</p>
      </div></body></html>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'SyncCircle <onboarding@resend.dev>',
        to: [profile.email],
        subject: title,
        html,
      }),
    });
    const result = await resp.json();
    if (!resp.ok) {
      console.error('Resend error', result);
      return new Response(JSON.stringify({ error: result }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, id: result.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
