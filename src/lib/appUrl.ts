export const PUBLIC_APP_ORIGIN = 'https://socali.lovable.app';

export function authOrigin(origin = window.location.origin): string {
  return /^https?:\/\//.test(origin) ? origin : PUBLIC_APP_ORIGIN;
}

export function publicAppUrl(path: string): string {
  return new URL(path, PUBLIC_APP_ORIGIN).toString();
}