import type { SessionDto } from '@sams/shared-types';

export async function refreshSession(): Promise<SessionDto | null> {
  const response = await window.sams.auth.getSession();
  if (!response.success || !response.data) {
    return null;
  }
  return response.data;
}

export function getIpcErrorMessage(error?: { message?: string; code?: string }): string {
  if (error?.code === 'PERMISSION_DENIED') {
    return 'You do not have permission to perform this action.';
  }
  if (error?.code === 'YEAR_CLOSED') {
    return 'The financial year is closed. Reopen the year or open a new financial year to make changes.';
  }
  return error?.message ?? 'Unexpected error';
}
