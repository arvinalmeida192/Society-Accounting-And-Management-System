import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { ErrorCodes, type LoginResult, type UserDto } from '@sams/shared-types';
import { resolvePermissionKeys } from './permission-seed.js';

const BCRYPT_COST = 12;

/** SDD §26.2 AuthService */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function loginUser(
  client: PrismaClient,
  username: string,
  password: string,
): Promise<LoginResult> {
  const user = await client.user.findUnique({
    where: { username: username.trim() },
  });

  if (!user) {
    throw new AuthError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid username or password.');
  }

  if (!user.isActive) {
    throw new AuthError(ErrorCodes.USER_INACTIVE, 'This user account is inactive.');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AuthError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid username or password.');
  }

  const updated = await client.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const userDto: UserDto = {
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    role: updated.role as UserDto['role'],
    isActive: updated.isActive,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
  };

  return {
    user: userDto,
    permissions: resolvePermissionKeys(updated.role as UserDto['role']),
  };
}

export async function changePassword(
  client: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean }> {
  if (!newPassword || newPassword.length < 8) {
    throw new AuthError(ErrorCodes.VALIDATION_ERROR, 'New password must be at least 8 characters.');
  }

  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthError(ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect.');
  }

  await client.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return { success: true };
}
