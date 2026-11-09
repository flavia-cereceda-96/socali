import { describe, it, expect } from 'vitest';
import { personName } from './personName';
describe('personName', () => {
  it('uses display name when set', () => expect(personName({ display_name: 'Mica', username: 'mica_r' })).toBe('Mica'));
  it('falls back to @username when display name empty', () => expect(personName({ display_name: '  ', username: 'mica_r' })).toBe('@mica_r'));
});
