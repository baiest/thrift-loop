import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../models/user.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { HttpError } from '../lib/http-error.js';
import { createAuthService, type AuthService, type RegisterInput } from './auth.service.js';

class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  findByPhone(phone: string): Promise<User | null> {
    return Promise.resolve(this.users.get(phone) ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve([...this.users.values()].find((user) => user.id === id) ?? null);
  }

  save(user: User): Promise<void> {
    this.users.set(user.phone, user);
    return Promise.resolve();
  }

  async update(
    id: string,
    patch: Partial<Pick<User, 'address' | 'categoryPreference'>>,
  ): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.users.set(updated.phone, updated);
    return updated;
  }
}

const validInput: RegisterInput = {
  phone: '3001234567',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  password: 'Abcdefg1',
  confirmPassword: 'Abcdefg1',
  categoryPreference: '',
};

async function catchHttpError(promise: Promise<unknown>): Promise<HttpError> {
  try {
    await promise;
    throw new Error('Expected promise to reject with an HttpError');
  } catch (error) {
    if (error instanceof HttpError) {
      return error;
    }
    throw error;
  }
}

async function expectHttpError(
  promise: Promise<unknown>,
  status: number,
  fieldKey?: string,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(HttpError);
  try {
    await promise;
  } catch (error) {
    const httpError = error as HttpError;
    expect(httpError.status).toBe(status);
    if (fieldKey) {
      // fieldKey is a literal test-fixture string, not attacker-controlled input.
      // eslint-disable-next-line security/detect-object-injection
      expect(httpError.fields?.[fieldKey]).toBeDefined();
    }
  }
}

describe('AuthService', () => {
  let repository: FakeUserRepository;
  let service: AuthService;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    repository = new FakeUserRepository();
    service = createAuthService(repository);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('register', () => {
    it('creates a user and returns a public user with a token', async () => {
      const result = await service.register(validInput);

      expect(typeof result.user.id).toBe('string');
      expect(result.user).toMatchObject({
        firstName: 'Ana',
        lastName: 'Gómez',
        city: 'Bogotá D.C.',
        country: 'CO',
      });
      expect(typeof result.token).toBe('string');
    });

    it('gives the new user a USR-prefixed id', async () => {
      const result = await service.register(validInput);
      expect(result.user.id.startsWith('USR-')).toBe(true);
    });

    it('sets createdAt and updatedAt to the same timestamp on creation', async () => {
      await service.register(validInput);
      const stored = await repository.findByPhone(validInput.phone);

      expect(stored?.createdAt).toBeDefined();
      expect(stored?.updatedAt).toBe(stored?.createdAt);
    });

    it('stores a bcrypt hash, never the plain password', async () => {
      await service.register(validInput);
      const stored = await repository.findByPhone(validInput.phone);

      expect(stored?.passwordHash).not.toBe(validInput.password);
      expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('rejects a duplicate phone number', async () => {
      await service.register(validInput);
      await expectHttpError(service.register(validInput), 409, 'phone');
    });

    it('rejects an invalid phone number', async () => {
      await expectHttpError(service.register({ ...validInput, phone: '123' }), 400, 'phone');
    });

    it('rejects an empty first name', async () => {
      await expectHttpError(service.register({ ...validInput, firstName: '  ' }), 400, 'firstName');
    });

    it('rejects an empty last name', async () => {
      await expectHttpError(service.register({ ...validInput, lastName: '  ' }), 400, 'lastName');
    });

    it('rejects a city outside the fixed list', async () => {
      await expectHttpError(service.register({ ...validInput, city: 'Miami' }), 400, 'city');
    });

    it('rejects a password that does not meet the policy', async () => {
      await expectHttpError(
        service.register({ ...validInput, password: 'weak', confirmPassword: 'weak' }),
        400,
        'password',
      );
    });

    it('rejects a mismatched password confirmation', async () => {
      await expectHttpError(
        service.register({ ...validInput, confirmPassword: 'Different1' }),
        400,
        'confirmPassword',
      );
    });

    it('registers successfully with no category preference', async () => {
      const result = await service.register(validInput);
      expect(result.user.categoryPreference).toBeNull();
    });

    it('registers with a valid category preference', async () => {
      const result = await service.register({ ...validInput, categoryPreference: 'jeans' });
      expect(result.user.categoryPreference).toBe('jeans');
    });

    it('rejects an invalid category preference', async () => {
      await expectHttpError(
        service.register({ ...validInput, categoryPreference: 'hats' }),
        400,
        'categoryPreference',
      );
    });
  });

  describe('login', () => {
    it('logs in with the correct phone and password', async () => {
      await service.register(validInput);

      const result = await service.login({
        phone: validInput.phone,
        password: validInput.password,
      });

      expect(result.user.id).toEqual(expect.any(String));
      expect(result.token).toEqual(expect.any(String));
    });

    it('rejects an unknown phone number with a generic error', async () => {
      await expectHttpError(service.login({ phone: '3009999999', password: 'whatever1A' }), 401);
    });

    it('rejects an incorrect password with the same generic error', async () => {
      await service.register(validInput);

      await expectHttpError(
        service.login({ phone: validInput.phone, password: 'WrongPassword1' }),
        401,
      );
    });

    it('uses the same error message for unknown phone and wrong password', async () => {
      await service.register(validInput);

      const unknownPhoneError = await catchHttpError(
        service.login({ phone: '3009999999', password: 'whatever1A' }),
      );
      const wrongPasswordError = await catchHttpError(
        service.login({ phone: validInput.phone, password: 'WrongPassword1' }),
      );

      expect(unknownPhoneError.message).toBe(wrongPasswordError.message);
    });
  });

  describe('updateProfile', () => {
    it('sets the address', async () => {
      const registered = await service.register(validInput);
      const updated = await service.updateProfile(registered.user.id, { address: 'Calle 1' });

      expect(updated.address).toBe('Calle 1');
    });

    it('trims the address', async () => {
      const registered = await service.register(validInput);
      const updated = await service.updateProfile(registered.user.id, {
        address: '  Calle 1  ',
      });

      expect(updated.address).toBe('Calle 1');
    });

    it('treats an empty address as clearing it', async () => {
      const registered = await service.register(validInput);
      await service.updateProfile(registered.user.id, { address: 'Calle 1' });
      const cleared = await service.updateProfile(registered.user.id, { address: '' });

      expect(cleared.address).toBeNull();
    });

    it('rejects an address longer than the max length', async () => {
      const registered = await service.register(validInput);
      await expectHttpError(
        service.updateProfile(registered.user.id, { address: 'x'.repeat(201) }),
        400,
        'address',
      );
    });

    it('404s a user that no longer exists', async () => {
      await expectHttpError(service.updateProfile('USR-missing', { address: 'Calle 1' }), 404);
    });

    it('sets the category preference', async () => {
      const registered = await service.register(validInput);
      const updated = await service.updateProfile(registered.user.id, {
        categoryPreference: 'jeans',
      });

      expect(updated.categoryPreference).toBe('jeans');
    });

    it('treats an empty category preference as clearing it', async () => {
      const registered = await service.register(validInput);
      await service.updateProfile(registered.user.id, { categoryPreference: 'jeans' });
      const cleared = await service.updateProfile(registered.user.id, {
        categoryPreference: '',
      });

      expect(cleared.categoryPreference).toBeNull();
    });

    it('rejects an invalid category preference', async () => {
      const registered = await service.register(validInput);
      await expectHttpError(
        service.updateProfile(registered.user.id, { categoryPreference: 'hats' }),
        400,
        'categoryPreference',
      );
    });

    it('leaves the address untouched when only updating the category preference', async () => {
      const registered = await service.register(validInput);
      await service.updateProfile(registered.user.id, { address: 'Calle 1' });
      const updated = await service.updateProfile(registered.user.id, {
        categoryPreference: 'jeans',
      });

      expect(updated.address).toBe('Calle 1');
    });
  });
});
