export interface NotificationTarget { type: string; event_id?: string | null; group_id?: string | null; source_user_id?: string | null }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function notificationPath(item: NotificationTarget): string {
  if (item.event_id && uuid.test(item.event_id)) return `/event/${item.event_id}`;
  if (item.type === 'friend_request') return '/people';
  if (item.type === 'friend_accepted' && item.source_user_id && uuid.test(item.source_user_id)) return `/person/${item.source_user_id}`;
  if (item.type === 'group_invite') return '/requests';
  if (item.group_id && uuid.test(item.group_id)) return `/people/groups/${item.group_id}`;
  return '/requests';
}
export function safePushPath(value: unknown): string {
  return typeof value === 'string' && (['/requests', '/people'].includes(value) || /^\/(event|person)\/[0-9a-f-]{36}$/i.test(value) || /^\/people\/groups\/[0-9a-f-]{36}$/i.test(value)) ? value : '/requests';
}
export function buildNotification(type: string, actor = 'Someone', event = 'your event', group = 'your group', language = 'en') {
  const es = language.startsWith('es');
  const messages: Record<string, [string, string]> = {
    invitation: [`${actor} invited you to ${event}`, `${actor} te invitó a ${event}`],
    date_poll_invite: [`${actor} invited you to vote on dates for ${event}`, `${actor} te invitó a votar las fechas de ${event}`],
    comment: [`${actor} commented on ${event}`, `${actor} comentó en ${event}`],
    mention: [`${actor} mentioned you in ${event}`, `${actor} te mencionó en ${event}`],
    rsvp_confirmed: [`${actor} is going to ${event}`, `${actor} va a ${event}`],
    rsvp_accepted: [`${actor} is going to ${event}`, `${actor} va a ${event}`],
    rsvp_declined: [`${actor} can't make it to ${event}`, `${actor} no puede ir a ${event}`],
    rsvp_maybe: [`${actor} might come to ${event}`, `${actor} quizá vaya a ${event}`],
    rsvp_pending: [`${actor} updated their RSVP for ${event}`, `${actor} actualizó su respuesta para ${event}`],
    friend_request: [`${actor} sent you a friend request`, `${actor} te envió una solicitud de amistad`],
    friend_accepted: [`${actor} accepted your friend request`, `${actor} aceptó tu solicitud de amistad`],
    group_invite: [`${actor} invited you to ${group}`, `${actor} te invitó a ${group}`],
    group_message: [`${actor} sent a message in ${group}`, `${actor} envió un mensaje en ${group}`],
    date_confirmed: [`The date for ${event} is confirmed`, `La fecha de ${event} está confirmada`],
    what_confirmed: [`The plan for ${event} is confirmed`, `El plan de ${event} está confirmado`],
    rsvp_nudge: [`${actor} is asking you to RSVP to ${event}`, `${actor} te pide confirmar tu asistencia a ${event}`],
    event_reminder: [`${event} is today`, `${event} es hoy`],
    poll_closing: [`The date poll for ${event} closes today`, `La encuesta de fechas de ${event} cierra hoy`],
  };
  return { title: 'C A L I', body: (messages[type] ?? ['You have a new notification', 'Tienes una nueva notificación'])[es ? 1 : 0] };
}
export type PushCategory = 'push_plans' | 'push_rsvps' | 'push_comments' | 'push_group_chat' | 'push_friends';
export const PUSH_CATEGORIES: PushCategory[] = ['push_plans', 'push_rsvps', 'push_comments', 'push_group_chat', 'push_friends'];
export function pushCategory(type: string): PushCategory | null {
  if (type.startsWith('rsvp_') && type !== 'rsvp_nudge') return 'push_rsvps';
  if (['invitation', 'date_poll_invite', 'date_confirmed', 'what_confirmed', 'rsvp_nudge', 'event_reminder', 'poll_closing'].includes(type)) return 'push_plans';
  if (type === 'comment' || type === 'mention') return 'push_comments';
  if (type === 'group_message') return 'push_group_chat';
  if (['friend_request', 'friend_accepted', 'group_invite'].includes(type)) return 'push_friends';
  return null;
}
export type PushPrefs = Partial<Record<'push_notifications' | PushCategory, unknown>>;
/** Master toggle AND the matching category must be explicitly true; blocked senders never push. */
export function pushAllowed(prefs: PushPrefs | null | undefined, type: string, blocked: boolean) {
  const category = pushCategory(type);
  return !blocked && prefs?.push_notifications === true && !!category && prefs[category] === true;
}
/** group_message collapses per group; everything else stays unique but stacks by thread. */
export function pushGrouping(item: { id: string; type: string; event_id?: string | null; group_id?: string | null }) {
  const thread = item.event_id ? `event:${item.event_id}` : item.group_id ? `group:${item.group_id}` : 'general';
  const collapse = item.type === 'group_message' && item.group_id ? `group:${item.group_id}` : item.id;
  return { collapseId: collapse, androidTag: collapse, threadId: thread };
}