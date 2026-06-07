import { UserRole, type SessionDto } from '@sams/shared-types';
import type { UserDto } from '@sams/shared-types';

export interface SessionState {
  sessionToken: string | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  role: UserRole | null;
  permissions: string[];
  databasePath: string | null;
  financialYearId: string | null;
  fyLabel: string | null;
  societyName: string | null;
  isReadOnly: boolean;
}

const emptySession = (): SessionState => ({
  sessionToken: null,
  userId: null,
  username: null,
  displayName: null,
  role: null,
  permissions: [],
  databasePath: null,
  financialYearId: null,
  fyLabel: null,
  societyName: null,
  isReadOnly: false,
});

let currentSession: SessionState = emptySession();

export const sessionManager = {
  get(): SessionState {
    return currentSession;
  },

  bindDatabase(input: {
    sessionToken: string;
    databasePath: string;
    financialYearId: string;
    fyLabel: string;
    societyName: string;
    isReadOnly: boolean;
  }): void {
    currentSession = {
      ...emptySession(),
      sessionToken: input.sessionToken,
      databasePath: input.databasePath,
      financialYearId: input.financialYearId,
      fyLabel: input.fyLabel,
      societyName: input.societyName,
      isReadOnly: input.isReadOnly,
    };
  },

  bindUser(user: UserDto, permissions: string[]): void {
    currentSession = {
      ...currentSession,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      permissions,
    };
  },

  clearUser(): void {
    currentSession = {
      ...currentSession,
      userId: null,
      username: null,
      displayName: null,
      role: null,
      permissions: [],
    };
  },

  clear(): void {
    currentSession = emptySession();
  },

  toDto(): SessionDto {
    return {
      sessionToken: currentSession.sessionToken,
      userId: currentSession.userId,
      username: currentSession.username,
      displayName: currentSession.displayName,
      role: currentSession.role,
      permissions: currentSession.permissions,
      databasePath: currentSession.databasePath,
      financialYearId: currentSession.financialYearId,
      fyLabel: currentSession.fyLabel,
      societyName: currentSession.societyName,
      isReadOnly: currentSession.isReadOnly,
    };
  },
};
