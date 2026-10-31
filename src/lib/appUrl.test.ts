import { describe, expect, it } from 'vitest';
import { authOrigin, publicAppUrl } from './appUrl';

describe('outgoing app links', () => {
  it('never shares a native origin', () => {
    expect(publicAppUrl('/invite/event/abc')).toBe('https://socali.lovable.app/invite/event/abc');
  });
  it('uses the public address for native auth callbacks', () => {
    expect(authOrigin('capacitor://localhost')).toBe('https://socali.lovable.app');
  });
  it('preserves the web origin for web authentication', () => {
    expect(authOrigin('https://socali.lovable.app')).toBe('https://socali.lovable.app');
  });
});