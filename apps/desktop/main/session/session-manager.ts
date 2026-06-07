import { UserRole, type SessionDto } from '@sams/shared-types';

export interface SessionState {
  userId: string | null;
  username: string | null;
  role: UserRole | null;
  permissions: string[];
  databasePath: string | null;
  isReadOnly: boolean;
}

const emptySession = (): SessionState => ({
  userId: null,
  username: null,
  role: null,
  permissions: [],
  databasePath: null,
  isReadOnly: false,
});

let currentSession: SessionState = emptySession();

export const sessionManager = {
  get(): SessionState {
    return currentSession;
  },

  set(partial: Partial<SessionState>): void {
    currentSession = { ...currentSession, ...partial };
  },

  clear(): void {
    currentSession = emptySession();
  },

  toDto(): SessionDto {
    return {
      userId: currentSession.userId,
      username: currentSession.username,
      role: currentSession.role,
      permissions: currentSession.permissions,
      databasePath: currentSession.databasePath,
      isReadOnly: currentSession.isReadOnly,
    };
  },
};
