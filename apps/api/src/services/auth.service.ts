import bcrypt from 'bcryptjs';
import {
  isColombiaCity,
  isColombianMobilePhone,
  validatePassword,
  type PasswordRule,
  type PublicUser,
} from '@thrift-loop/shared';
import type { User } from '../models/user.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { signSessionToken } from '../lib/jwt.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import { HttpError } from '../lib/http-error.js';
import { createPrefixedId } from '../lib/prefixed-id.js';

const USER_ID_PREFIX = 'USR';

const SALT_ROUNDS = 10;
const GENERIC_LOGIN_ERROR = 'Phone number or password is incorrect';
const MAX_ADDRESS_LENGTH = 200;
const USER_NOT_FOUND_MESSAGE = 'User not found';

const PASSWORD_RULE_MESSAGES: Record<PasswordRule, string> = {
  minLength: 'Password must be at least 8 characters',
  uppercase: 'Password must include an uppercase letter',
  lowercase: 'Password must include a lowercase letter',
  digit: 'Password must include a digit',
};

export interface RegisterInput {
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export interface UpdateProfileInput {
  address: string;
}

export interface AuthService {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser>;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    city: user.city,
    country: user.country,
    address: user.address,
  };
}

function validateRegisterInput(input: RegisterInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isColombianMobilePhone(input.phone)) {
    errors['phone'] = 'Enter a valid Colombian mobile number (10 digits, starts with 3)';
  }
  if (input.firstName.trim().length === 0) {
    errors['firstName'] = 'First name is required';
  }
  if (input.lastName.trim().length === 0) {
    errors['lastName'] = 'Last name is required';
  }
  if (!isColombiaCity(input.city)) {
    errors['city'] = 'Select a valid city';
  }

  const passwordViolations = validatePassword(input.password);
  const firstViolation = passwordViolations[0];
  if (firstViolation) {
    // firstViolation is a PasswordRule from the shared validator's closed union,
    // not attacker-controlled input.
    // eslint-disable-next-line security/detect-object-injection
    errors['password'] = PASSWORD_RULE_MESSAGES[firstViolation];
  } else if (input.password !== input.confirmPassword) {
    errors['confirmPassword'] = 'Passwords do not match';
  }

  return errors;
}

async function registerUser(
  userRepository: UserRepository,
  input: RegisterInput,
): Promise<AuthResult> {
  const errors = validateRegisterInput(input);
  if (Object.keys(errors).length > 0) {
    throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors);
  }

  const existing = await userRepository.findByPhone(input.phone);
  if (existing) {
    throw new HttpError('Phone number already registered', HTTP_STATUS.CONFLICT, {
      phone: 'This phone number is already registered',
    });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const user: User = {
    id: createPrefixedId(USER_ID_PREFIX),
    phone: input.phone,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    city: input.city,
    country: 'CO',
    passwordHash,
    address: null,
    createdAt: now,
    updatedAt: now,
  };
  await userRepository.save(user);

  return { user: toPublicUser(user), token: signSessionToken({ userId: user.id }) };
}

async function loginUser(userRepository: UserRepository, input: LoginInput): Promise<AuthResult> {
  const user = await userRepository.findByPhone(input.phone);
  if (!user) {
    throw new HttpError(GENERIC_LOGIN_ERROR, HTTP_STATUS.UNAUTHORIZED);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(GENERIC_LOGIN_ERROR, HTTP_STATUS.UNAUTHORIZED);
  }

  return { user: toPublicUser(user), token: signSessionToken({ userId: user.id }) };
}

async function updateProfile(
  userRepository: UserRepository,
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const trimmed = input.address.trim();
  if (trimmed.length > MAX_ADDRESS_LENGTH) {
    throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, {
      address: `Address must be at most ${MAX_ADDRESS_LENGTH} characters`,
    });
  }

  const updated = await userRepository.update(userId, {
    address: trimmed.length > 0 ? trimmed : null,
  });
  if (!updated) {
    throw new HttpError(USER_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
  }
  return toPublicUser(updated);
}

export function createAuthService(userRepository: UserRepository): AuthService {
  return {
    register: (input) => registerUser(userRepository, input),
    login: (input) => loginUser(userRepository, input),
    updateProfile: (userId, input) => updateProfile(userRepository, userId, input),
  };
}
