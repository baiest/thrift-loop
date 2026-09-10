import bcrypt from 'bcryptjs';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isColombiaCity,
  isColombianMobilePhone,
  isItemCategory,
  validatePassword,
  type PasswordRule,
  type PublicUser,
} from '@thrift-loop/shared';
import type { User } from '../models/user.js';
import type { UserPatch, UserRepository } from '../repositories/user.repository.js';
import { signSessionToken } from '../lib/jwt.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import { HttpError } from '../lib/http-error.js';
import { createPrefixedId } from '../lib/prefixed-id.js';
import { NOOP_LOGGER, type Logger } from '../lib/logger.js';

const USER_ID_PREFIX = 'USR';

const SALT_ROUNDS = 10;
const GENERIC_LOGIN_ERROR = 'Phone number or password is incorrect';
const MAX_ADDRESS_LENGTH = 200;
const USER_NOT_FOUND_MESSAGE = 'User not found';
const CATEGORY_PREFERENCE_ERROR_MESSAGE = 'Select a valid category';
const FIRST_NAME_ERROR_MESSAGE = 'First name is required';
const LAST_NAME_ERROR_MESSAGE = 'Last name is required';
const CITY_ERROR_MESSAGE = 'Select a valid city';

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
  categoryPreference: string;
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
  address?: string;
  categoryPreference?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
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
    categoryPreference: user.categoryPreference,
    notificationPreferences: user.notificationPreferences,
  };
}

function parseCategoryPreference(
  value: string,
  errors: Record<string, string>,
): User['categoryPreference'] | undefined {
  if (value.length === 0) {
    return null;
  }
  if (isItemCategory(value)) {
    return value;
  }
  errors['categoryPreference'] = CATEGORY_PREFERENCE_ERROR_MESSAGE;
  return undefined;
}

function validateRegisterInput(input: RegisterInput): Record<string, string> {
  const errors: Record<string, string> = {};

  parseCategoryPreference(input.categoryPreference, errors);
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
  logger: Logger,
  input: RegisterInput,
): Promise<AuthResult> {
  const errors = validateRegisterInput(input);
  if (Object.keys(errors).length > 0) {
    logger.warning('auth_register_failed', {
      reason: 'validation_failed',
      fields: Object.keys(errors),
    });
    throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors);
  }

  const existing = await userRepository.findByPhone(input.phone);
  if (existing) {
    logger.warning('auth_register_failed', { reason: 'phone_taken' });
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
    categoryPreference: parseCategoryPreference(input.categoryPreference, {}) ?? null,
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: now,
    updatedAt: now,
  };
  await userRepository.save(user);
  logger.info('auth_register_succeeded', { userId: user.id });

  return { user: toPublicUser(user), token: signSessionToken({ userId: user.id }) };
}

async function loginUser(
  userRepository: UserRepository,
  logger: Logger,
  input: LoginInput,
): Promise<AuthResult> {
  const user = await userRepository.findByPhone(input.phone);
  if (!user) {
    logger.warning('auth_login_failed', { reason: 'user_not_found' });
    throw new HttpError(GENERIC_LOGIN_ERROR, HTTP_STATUS.UNAUTHORIZED);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    logger.warning('auth_login_failed', { reason: 'invalid_password' });
    throw new HttpError(GENERIC_LOGIN_ERROR, HTTP_STATUS.UNAUTHORIZED);
  }

  logger.info('auth_login_succeeded', { userId: user.id });
  return { user: toPublicUser(user), token: signSessionToken({ userId: user.id }) };
}

function applyAddressPatch(
  input: UpdateProfileInput,
  patch: UserPatch,
  errors: Record<string, string>,
): void {
  if (input.address === undefined) {
    return;
  }
  const trimmed = input.address.trim();
  if (trimmed.length > MAX_ADDRESS_LENGTH) {
    errors['address'] = `Address must be at most ${MAX_ADDRESS_LENGTH} characters`;
  } else {
    patch.address = trimmed.length > 0 ? trimmed : null;
  }
}

function applyRequiredTextPatch(
  value: string | undefined,
  field: 'firstName' | 'lastName',
  patch: UserPatch,
  errors: Record<string, string>,
): void {
  if (value === undefined) {
    return;
  }
  const trimmed = value.trim();
  // field is narrowed to the fixed 'firstName' | 'lastName' union, not request data.
  /* eslint-disable security/detect-object-injection */
  if (trimmed.length === 0) {
    errors[field] = field === 'firstName' ? FIRST_NAME_ERROR_MESSAGE : LAST_NAME_ERROR_MESSAGE;
  } else {
    patch[field] = trimmed;
  }
  /* eslint-enable security/detect-object-injection */
}

function applyCityPatch(
  input: UpdateProfileInput,
  patch: UserPatch,
  errors: Record<string, string>,
): void {
  if (input.city === undefined) {
    return;
  }
  if (isColombiaCity(input.city)) {
    patch.city = input.city;
  } else {
    errors['city'] = CITY_ERROR_MESSAGE;
  }
}

function buildProfilePatch(input: UpdateProfileInput, errors: Record<string, string>): UserPatch {
  const patch: UserPatch = {};
  applyAddressPatch(input, patch, errors);
  applyRequiredTextPatch(input.firstName, 'firstName', patch, errors);
  applyRequiredTextPatch(input.lastName, 'lastName', patch, errors);
  applyCityPatch(input, patch, errors);
  if (input.categoryPreference !== undefined) {
    const categoryPreference = parseCategoryPreference(input.categoryPreference, errors);
    if (categoryPreference !== undefined) {
      patch.categoryPreference = categoryPreference;
    }
  }
  return patch;
}

async function updateProfile(
  userRepository: UserRepository,
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const errors: Record<string, string> = {};
  const patch = buildProfilePatch(input, errors);
  if (Object.keys(errors).length > 0) {
    throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors);
  }

  const updated = await userRepository.update(userId, patch);
  if (!updated) {
    throw new HttpError(USER_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
  }
  return toPublicUser(updated);
}

export function createAuthService(
  userRepository: UserRepository,
  logger: Logger = NOOP_LOGGER,
): AuthService {
  return {
    register: (input) => registerUser(userRepository, logger, input),
    login: (input) => loginUser(userRepository, logger, input),
    updateProfile: (userId, input) => updateProfile(userRepository, userId, input),
  };
}
