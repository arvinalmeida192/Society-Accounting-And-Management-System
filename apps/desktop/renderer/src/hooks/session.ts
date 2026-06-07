import type { SessionDto } from '@sams/shared-types';

export async function refreshSession(): Promise<SessionDto | null> {
  const response = await window.sams.auth.getSession();
  if (!response.success || !response.data) {
    return null;
  }
  return response.data;
}

export function getIpcErrorMessage(error?: { message?: string }): string {
  return error?.message ?? 'Unexpected error';
}
