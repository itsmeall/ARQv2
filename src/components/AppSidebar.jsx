import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Ticket,
  Store,
  Users,
  Receipt,
  Wrench,
  Wallet,
  Settings,
  Building2,
  UserCheck,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function navForRole(session) {
  if (session.appRole === 'owner_admin' || session.appRole === 'admin') {
    const items = [
      { label: 'Beranda', path: '/', icon: LayoutDashboard, end: true },
      { label: 'Paket & Harga', path: '/paket', icon: Boxes },
      { label: 'Voucher', path: '/voucher', icon: Ticket },
      { label: 'Reseller', path: '/reseller', icon: Store },
      { label: 'Pelanggan', path: '/pelanggan', icon: Users },
      { label: 'Tagihan', path: '/invoice', icon: Receipt },
      { label: 'Tiket', path: '/tiket', icon: Wrench },
      { label: 'Keuangan', path: '/laporan', icon: Wallet },
      { label: 'Pengaturan', path: '/pengaturan', icon: Settings },
    ];
    if (session.isPlatformAdmin) items.unshift(
      { label: 'Perusahaan', path: '/perusahaan', icon: Building2 },
      { label: 'Persetujuan', path: '/admin/pendaftaran', icon: UserCheck },
    );
    return items;
  }
  if (session.appRole === 'reseller') {
    return [
      { label: 'Beranda', path: '/', icon: LayoutDashboard, end: true },
      { label: 'Stok Saya', path: '/mitra/stok', icon: Boxes },
      { label: 'Penjualan Saya', path: '/mitra/penjualan', icon: Ticket },
      { label: 'Komisi Saya', path: '/mitra/komisi', icon: Wallet },
    ];
  }
  if (session.appRole === 'technician') {
    return [
      { label: 'Beranda', path: '/', icon: LayoutDashboard, end: true },
      { label: 'Tiket Saya', path: '/teknisi/tiket', icon: Wrench },
    ];
  }
  if (session.appRole === 'customer') {
    return [
      { label: 'Beranda', path: '/', icon: LayoutDashboard, end: true },
      { label: 'Tagihan Saya', path: '/akun/invoice', icon: Receipt },
    ];
  }
  if (session.isPlatformAdmin) {
    return [
      { label: 'Perusahaan', path: '/perusahaan', icon: Building2 },
      { label: 'Persetujuan', path: '/admin/pendaftaran', icon: UserCheck },
    ];
  }
  return [];
}

export default function AppSidebar({ session, onNavigate }) {
  const items = navForRole(session);

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-heading text-[13px] font-extrabold text-primary-foreground">
          AR
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold leading-tight tracking-tight">ARQ</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {session.tenant?.name || 'Platform Voucher & ISP'}
          </p>
        </div>
      </div>

      {session.memberships?.length > 1 ? (
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Perusahaan aktif</p>
          <Select value={session.activeTenantId || ''} onValueChange={session.setActiveTenant}>
            <SelectTrigger aria-label="Pilih perusahaan aktif"><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger>
            <SelectContent>
              {session.memberships.map((membership) => (
                <SelectItem key={membership.tenant_id} value={membership.tenant_id}>{membership.tenant_name || membership.tenant_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-muted-foreground')} strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card font-heading text-xs font-bold text-primary shadow-sm">
            {initials(session.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{session.displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{session.user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge variant="outline" className="rounded-full border-border bg-card text-[10px] font-semibold uppercase tracking-wider">
            {roleLabel(session.appRole)}
          </Badge>
          <button
            type="button"
            onClick={() => base44.auth.logout('/login')}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

function roleLabel(value) {
  const labels = {
    owner_admin: 'Pemilik',
    admin: 'Admin',
    reseller: 'Reseller',
    technician: 'Teknisi',
    customer: 'Pelanggan',
  };
  return labels[value] || 'Tanpa peran';
}
