import { describe, expect, it } from 'vitest';
import { notificationPath, safePushPath, pushAllowed, buildNotification } from '../../supabase/functions/_shared/notificationContent';
describe('native push rules', () => {
  const id = '11111111-2222-4333-8444-555555555555';
  it('requires explicit push opt-in', () => { expect(pushAllowed(null, false)).toBe(false); expect(pushAllowed(false, false)).toBe(false); expect(pushAllowed(true, false)).toBe(true); });
  it('suppresses blocked senders', () => expect(pushAllowed(true, true)).toBe(false));
  it('opens the relevant event', () => expect(notificationPath({ type: 'date_confirmed', event_id: id })).toBe(`/event/${id}`));
  it('opens group invitations where they can be accepted', () => expect(notificationPath({ type: 'group_invite', group_id: id })).toBe('/requests'));
  it('opens group messages in the group', () => expect(notificationPath({ type: 'group_message', group_id: id })).toBe(`/people/groups/${id}`));
  it('opens friend requests in Friends', () => expect(notificationPath({ type: 'friend_request' })).toBe('/people'));
  it('rejects external and unrecognized push targets', () => { expect(safePushPath('https://example.com')).toBe('/requests'); expect(safePushPath('//example.com')).toBe('/requests'); expect(safePushPath('/settings')).toBe('/requests'); });
  it('supports Spanish notifications', () => expect(buildNotification('event_reminder', '', 'Cena', '', 'es').body).toBe('Cena es hoy'));
});