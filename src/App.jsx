import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { SessionProvider } from '@/lib/session';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Packages from '@/pages/Packages';
import Vouchers from '@/pages/Vouchers';
import VoucherBatchDetail from '@/pages/VoucherBatchDetail';
import Resellers from '@/pages/Resellers';
import ResellerDetail from '@/pages/ResellerDetail';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import Invoices from '@/pages/Invoices';
import Tickets from '@/pages/Tickets';
import TicketDetail from '@/pages/TicketDetail';
import Finance from '@/pages/Finance';
import Settings from '@/pages/Settings';
import Tenants from '@/pages/Tenants';
import TenantDetail from '@/pages/TenantDetail';
import MitraStock from '@/pages/mitra/MitraStock';
import MitraSales from '@/pages/mitra/MitraSales';
import MitraCommission from '@/pages/mitra/MitraCommission';
import TeknisiTickets from '@/pages/teknisi/TeknisiTickets';
import AkunInvoices from '@/pages/akun/AkunInvoices';
import RegistrationApprovals from '@/pages/admin/RegistrationApprovals';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <SessionProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />

            <Route element={<RoleRoute allow={['owner_admin', 'admin']} />}>
              <Route path="/paket" element={<Packages />} />
              <Route path="/voucher" element={<Vouchers />} />
              <Route path="/voucher/batch/:batchId" element={<VoucherBatchDetail />} />
              <Route path="/reseller" element={<Resellers />} />
              <Route path="/reseller/:memberId" element={<ResellerDetail />} />
              <Route path="/pelanggan" element={<Customers />} />
              <Route path="/pelanggan/:customerId" element={<CustomerDetail />} />
              <Route path="/invoice" element={<Invoices />} />
              <Route path="/tiket" element={<Tickets />} />
              <Route path="/tiket/:ticketId" element={<TicketDetail />} />
              <Route path="/laporan" element={<Finance />} />
              <Route path="/pengaturan" element={<Settings />} />
            </Route>

            <Route element={<RoleRoute allow={['reseller']} />}>
              <Route path="/mitra/stok" element={<MitraStock />} />
              <Route path="/mitra/penjualan" element={<MitraSales />} />
              <Route path="/mitra/komisi" element={<MitraCommission />} />
            </Route>

            <Route element={<RoleRoute allow={['technician']} />}>
              <Route path="/teknisi/tiket" element={<TeknisiTickets />} />
            </Route>

            <Route element={<RoleRoute allow={['customer']} />}>
              <Route path="/akun/invoice" element={<AkunInvoices />} />
            </Route>

            <Route element={<RoleRoute platformAdmin />}>
              <Route path="/perusahaan" element={<Tenants />} />
              <Route path="/perusahaan/:tenantId" element={<TenantDetail />} />
              <Route path="/admin/pendaftaran" element={<RegistrationApprovals />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </SessionProvider>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
