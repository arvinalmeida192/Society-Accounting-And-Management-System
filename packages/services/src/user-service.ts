import type { PrismaClient } from '@prisma/client';
import { UserRole as PrismaUserRole } from '@prisma/client';
import type { UserDto, UserRole, UserSaveDto } from '@sams/shared-types';
import { hashPassword } from './auth-service.js';
import { assertWritable } from './assert-writable.js';

function mapUser(user: {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
}): UserDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export async function listUsers(client: PrismaClient): Promise<UserDto[]> {
  const rows = await client.user.findMany({ orderBy: { username: 'asc' } });
  return rows.map(mapUser);
}

export async function saveUser(
  client: PrismaClient,
  dto: UserSaveDto,
  actorId: string,
): Promise<UserDto> {
  await assertWritable(client);

  if (!dto.username.trim()) throw new Error('Username is required.');
  if (!dto.displayName.trim()) throw new Error('Display name is required.');

  if (dto.id) {
    if (dto.id === actorId && dto.isActive === false) {
      throw new Error('You cannot deactivate your own account.');
    }

    const existing = await client.user.findUniqueOrThrow({ where: { id: dto.id } });
    if (existing.role === PrismaUserRole.ADMIN && dto.isActive === false) {
      const activeAdmins = await client.user.count({
        where: { role: PrismaUserRole.ADMIN, isActive: true, id: { not: dto.id } },
      });
      if (activeAdmins === 0) {
        throw new Error('Cannot deactivate the last active administrator.');
      }
    }

    const updated = await client.user.update({
      where: { id: dto.id },
      data: {
        displayName: dto.displayName.trim(),
        role: dto.role,
        isActive: dto.isActive,
        updatedBy: actorId,
        ...(dto.password
          ? { passwordHash: await hashPassword(dto.password) }
          : {}),
      },
    });
    return mapUser(updated);
  }

  if (!dto.password || dto.password.length < 8) {
    throw new Error('Password must be at least 8 characters for new users.');
  }

  try {
    const created = await client.user.create({
      data: {
        username: dto.username.trim(),
        displayName: dto.displayName.trim(),
        role: dto.role,
        isActive: dto.isActive,
        passwordHash: await hashPassword(dto.password),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapUser(created);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new Error('Username is already in use.');
    }
    throw error;
  }
}

export async function resetUserPassword(
  client: PrismaClient,
  userId: string,
  newPassword: string,
  actorId: string,
): Promise<{ success: boolean }> {
  await assertWritable(client);

  if (!newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.');
  }

  await client.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      updatedBy: actorId,
    },
  });

  return { success: true };
}
