import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/session';
import LoadingScreen from '@/components/LoadingScreen';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import ResellerDashboard from '@/pages/dashboards/ResellerDashboard';
import TechnicianDashboard from '@/pages/dashboards/TechnicianDashboard';
import CustomerDashboard from '@/pages/dashboards/CustomerDashboard';

export default function Home() {
  const session = useSession();

  if (!session || session.loading) return <LoadingScreen />;
  if (session.appRole === 'owner_admin' || session.appRole === 'admin') return <AdminDashboard />;
  if (session.appRole === 'reseller') return <ResellerDashboard />;
  if (session.appRole === 'technician') return <TechnicianDashboard />;
  if (session.appRole === 'customer') return <CustomerDashboard />;
  if (session.isPlatformAdmin) return <Navigate to="/perusahaan" replace />;
  return null;
}