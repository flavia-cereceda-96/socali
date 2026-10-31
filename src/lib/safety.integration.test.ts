// These tests use only the requesting user's injected session. They never delete accounts.
import { describe, it, expect } from 'vitest';

const token = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const origin = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const enabled = !!token && !!session && !!origin && !!key;

describe.skipIf(!enabled)('live safety permissions', () => {
  const request = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(`${origin}/rest/v1/${path}`, { method, headers: { Authorization: `Bearer ${token}`, apikey: key || '', 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null };
  };
  it('cannot block yourself', async () => {
    const userId = JSON.parse(session || '{}').user.id;
    const result = await request('user_blocks', 'POST', { blocker_id: userId, blocked_user_id: userId });
    expect(result.status).toBe(400);
  });
  it('cannot create a block owned by another account', async () => {
    const userId = JSON.parse(session || '{}').user.id;
    const result = await request('user_blocks', 'POST', { blocker_id: '00000000-0000-4000-8000-000000000001', blocked_user_id: userId });
    expect(result.status).toBe(403);
  });
  it('cannot call privileged account cleanup', async () => {
    const userId = JSON.parse(session || '{}').user.id;
    const result = await request('rpc/purge_account_data', 'POST', { _user_id: userId });
    expect(result.status).toBe(401 + 2);
  });
  it('cannot forge a reviewed report', async () => {
    const userId = JSON.parse(session || '{}').user.id;
    const result = await request('user_reports', 'POST', { reporter_id: userId, reported_user_id: userId, content_type: 'profile', content_id: userId, reason: 'spam', status: 'removed' });
    expect(result.status >= 400).toBe(true);
  });
});