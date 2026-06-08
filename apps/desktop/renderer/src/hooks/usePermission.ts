import { PermissionAction } from '@sams/shared-types';
import { useSession } from './SessionContext';

export function usePermission(resource: string, action: PermissionAction | string): boolean {
  const { session } = useSession();
  if (!session?.permissions) return false;
  return session.permissions.includes(`${resource}:${action}`);
}

export function useHasAnyAdminAccess(): boolean {
  const { session } = useSession();
  if (!session?.permissions) return false;
  return session.permissions.some((key) => key.startsWith('admin.'));
}
