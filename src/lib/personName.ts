export type Nameable = { display_name?: string | null; username?: string | null } | null | undefined;

/** Name shown for a person in the UI: display name, else @username. */
export function personName(p: Nameable, fallback = 'Someone'): string {
  const d = p?.display_name?.trim();
  if (d) return d;
  return p?.username ? `@${p.username}` : fallback;
}
