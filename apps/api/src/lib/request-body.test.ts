import { describe, expect, it } from 'vitest';
import { pickPresentStringFields, pickStringFields } from './request-body.js';

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

describe('pickPresentStringFields', () => {
  it('includes only fields actually present in the body', () => {
    const result = pickPresentStringFields<LoginBody>({ phone: '3001234567' }, [
      'phone',
      'password',
    ]);

    expect(result).toEqual({ phone: '3001234567' });
  });

  it('returns an empty object when no requested fields are present', () => {
    expect(pickPresentStringFields<LoginBody>({}, ['phone', 'password'])).toEqual({});
  });

  it('handles a null or undefined body without throwing', () => {
    expect(pickPresentStringFields<LoginBody>(null, ['phone', 'password'])).toEqual({});
    expect(pickPresentStringFields<LoginBody>(undefined, ['phone', 'password'])).toEqual({});
  });

  it('coerces a present but non-string value to an empty string', () => {
    const result = pickPresentStringFields<LoginBody>({ phone: 12345 }, ['phone', 'password']);
    expect(result).toEqual({ phone: '' });
  });

  it('includes a present field even when its value is an empty string', () => {
    const result = pickPresentStringFields<LoginBody>({ phone: '' }, ['phone', 'password']);
    expect(result).toEqual({ phone: '' });
  });
});
