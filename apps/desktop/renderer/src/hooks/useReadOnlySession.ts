import { useSession } from './SessionContext';

export function useReadOnlySession(): boolean {
  const { session } = useSession();
  return Boolean(session?.isReadOnly);
}
