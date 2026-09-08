import { describe, expect, it } from 'vitest';
import { pickStringFields } from './request-body.js';

interface LoginBody {
  phone: string;
  password: string;
}

describe('pickStringFields', () => {
  it('picks the requested string fields from the body', () => {
    const result = pickStringFields<LoginBody>({ phone: '3001234567', password: 'secret' }, [
      'phone',
      'password',
    ]);

    expect(result).toEqual({ phone: '3001234567', password: 'secret' });
  });

  it('defaults missing fields to an empty string', () => {
    const result = pickStringFields<LoginBody>({ phone: '3001234567' }, ['phone', 'password']);

    expect(result).toEqual({ phone: '3001234567', password: '' });
  });

  it('defaults non-string fields to an empty string', () => {
    const result = pickStringFields<LoginBody>({ phone: 12345, password: null }, [
      'phone',
      'password',
    ]);

    expect(result).toEqual({ phone: '', password: '' });
  });

  it('handles a null or undefined body without throwing', () => {
    expect(pickStringFields<LoginBody>(null, ['phone', 'password'])).toEqual({
      phone: '',
      password: '',
    });
    expect(pickStringFields<LoginBody>(undefined, ['phone', 'password'])).toEqual({
      phone: '',
      password: '',
    });
  });

  it('ignores extra fields not in the requested list', () => {
    const result = pickStringFields<LoginBody>(
      { phone: '3001234567', password: 'secret', extra: 'ignored' },
      ['phone', 'password'],
    );

    expect(result).toEqual({ phone: '3001234567', password: 'secret' });
  });
});
