import { describe, it, expect } from 'vitest';
const token = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const origin = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
describe.skipIf(!token || !session || !origin || !key)('live push protections', () => {
  const headers = { Authorization: `Bearer ${token}`, apikey: key ?? '', 'Content-Type': 'application/json' };
  it('does not expose dispatch capabilities to signed-in clients', async () => {
    const response = await fetch(`${origin}/rest/v1/push_outbox?select=id`, { headers });
    expect(response.status).toBe(403);
  });
  it('does not let signed-in clients claim push deliveries', async () => {
    const response = await fetch(`${origin}/rest/v1/rpc/claim_push_delivery`, { method: 'POST', headers, body: JSON.stringify({ _id: '11111111-2222-4333-8444-555555555555' }) });
    expect(response.status).toBe(403);
  });
  it('rejects arbitrary push payloads', async () => {
    const response = await fetch(`${origin}/functions/v1/send-push-notification`, { method: 'POST', headers, body: JSON.stringify({ user_id: JSON.parse(session ?? '{}').user.id, type: 'invitation' }) });
    expect(response.status).toBe(400);
  });
  it('requires authentication to register a native device', async () => {
    const response = await fetch(`${origin}/functions/v1/register-push`, { method: 'POST', headers: { apikey: key ?? '', 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'validation-only-not-a-device-token', platform: 'ios' }) });
    expect(response.status).toBe(401);
  });
  it('does not allow direct client token inserts', async () => {
    const response = await fetch(`${origin}/rest/v1/user_push_tokens`, { method: 'POST', headers, body: JSON.stringify({ user_id: JSON.parse(session ?? '{}').user.id, token: 'validation-only-not-a-device-token', platform: 'ios' }) });
    expect(response.status).toBe(403);
  });
  it('rejects invalid timezones without updating the profile', async () => {
    const userId = JSON.parse(session ?? '{}').user.id;
    const response = await fetch(`${origin}/rest/v1/profiles?user_id=eq.${userId}`, { method: 'PATCH', headers, body: JSON.stringify({ notification_timezone: 'Invalid/NotAZone' }) });
    expect(response.status).toBe(400);
  });
});