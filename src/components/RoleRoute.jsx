import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/lib/session';

export default function RoleRoute({ allow = [], platformAdmin = false }) {
  const session = useSession();
  if (!session || session.loading) return null;
  const allowed = platformAdmin ? session.isPlatformAdmin : allow.includes(session.appRole);
  if (!allowed) return <Navigate to="/" replace />;
  return <Outlet />;
}