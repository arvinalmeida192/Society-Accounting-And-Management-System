import type { ReactNode } from 'react';
import { PermissionAction } from '@sams/shared-types';
import { usePermission } from '../hooks/usePermission';

interface PermissionGateProps {
  resource: string;
  action: PermissionAction | string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  resource,
  action,
  children,
  fallback = (
    <section className="placeholder-pane">
      <h2>Access Denied</h2>
      <p>You do not have permission to view this screen.</p>
    </section>
  ),
}: PermissionGateProps): React.ReactElement {
  const allowed = usePermission(resource, action);
  return <>{allowed ? children : fallback}</>;
}
