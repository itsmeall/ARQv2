import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Boxes, CheckCircle2, Receipt, Ticket, Users, Wallet, Wrench } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import LoadingScreen from '@/components/LoadingScreen';
import EmptyState from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addDaysISO, formatDate, formatIDR, formatIDRShort, formatPeriod, monthPeriod } from '@/lib/format';

const groupCount = (result) => Object.fromEntries((result?.rows || []).map((row) => [row.status, row.count]));

export default function AdminDashboard() {
  const { tenant, displayName } = useSession();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!tenant) return;
    let active = true;

    const load = async () => {
      const tenantQuery = { tenant_id: tenant.id };
      const period = monthPeriod();
      const chartStart = addDaysISO(-13).slice(0, 10);

      const [vouchers, invoices, customers, tickets, income, salesByDay, openTickets, recentSales, activities] =
        await Promise.all([
          base44.entities.Voucher.aggregate({ query: tenantQuery, groupBy: 'status' }),
          base44.entities.Invoice.aggregate({ query: tenantQuery, groupBy: 'status', sum: 'total' }),
          base44.entities.Customer.aggregate({ query: tenantQuery, groupBy: 'status' }),
          base44.entities.Ticket.aggregate({ query: tenantQuery, groupBy: 'status' }),
          base44.entities.Finance.aggregate({ query: { ...tenantQuery, type: 'income', date: { $gte: `${period}-01` } }, sum: 'amount' }),
          base44.entities.Voucher.aggregate({
            query: { ...tenantQuery, status: 'sold', sold_date: { $gte: chartStart } },
            groupBy: 'sold_date',
            sum: 'sold_price',
            sort: 'sold_date',
          }),
          base44.entities.Ticket.filter(
            { ...tenantQuery, status: { $in: ['open', 'in_progress', 'waiting'] } },
            { sort: '-created_date', limit: 5 },
          ),
          base44.entities.Voucher.filter({ ...tenantQuery, status: 'sold' }, { sort: '-sold_date', limit: 5 }),
          base44.entities.ActivityLog.filter(tenantQuery, { sort: '-created_date', limit: 6 }),
        ]);

      if (!active) return;

      const byDay = Object.fromEntries((salesByDay?.rows || []).map((row) => [row.sold_date, row.sum_sold_price || 0]));
      const chart = Array.from({ length: 14 }, (_, index) => {
        const day = addDaysISO(index - 13).slice(0, 10);
        return { day, label: formatDate(day).slice(0, 6), total: byDay[day] || 0 };
      });

      const invoiceRows = invoices?.rows || [];

      setData({
        voucherStatus: groupCount(vouchers),
        invoiceStatus: groupCount(invoices),
        customerStatus: groupCount(customers),
        ticketStatus: groupCount(tickets),
        income: income?.rows?.[0]?.sum_amount || 0,
        unpaid: invoiceRows
          .filter((row) => ['unpaid', 'overdue'].includes(row.status))
          .reduce((total, row) => total + (row.sum_total || 0), 0),
        chart,
        openTickets: openTickets?.items || [],
        recentSales: recentSales?.items || [],
        activities: activities?.items || [],
      });
    };

    load();
    return () => {
      active = false;
    };
  }, [tenant]);

  if (!tenant) return <LoadingScreen />;
  if (!data) return <LoadingScreen label="Menghitung ringkasan bisnis…" />;

  const available = data.voucherStatus.available || 0;
  const sold = data.voucherStatus.sold || 0;
  const activeCustomers = data.customerStatus.active || 0;
  const openCount =
    (data.ticketStatus.open || 0) + (data.ticketStatus.in_progress || 0) + (data.ticketStatus.waiting || 0);

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${displayName.split(' ')[0]}`}
        description={`Ringkasan operasional ${tenant.name} — ${formatPeriod(monthPeriod())}.`}
      >
        <Button asChild variant="outline">
          <Link to="/voucher">Kelola voucher</Link>
        </Button>
        <Button asChild>
          <Link to="/invoice">Buat tagihan</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Voucher tersedia" value={available} hint="Siap dijual di stok perusahaan" icon={Boxes} tone="sky" />
        <StatCard label="Voucher terjual" value={sold} hint="Total sepanjang waktu" icon={CheckCircle2} tone="emerald" />
        <StatCard label="Pendapatan bulan ini" value={formatIDRShort(data.income)} hint="Pemasukan tercatat" icon={Wallet} tone="violet" />
        <StatCard label="Tagihan belum lunas" value={formatIDRShort(data.unpaid)} hint="Termasuk yang menunggak" icon={Receipt} tone="rose" />
        <StatCard label="Pelanggan aktif" value={activeCustomers} hint="Langganan berjalan" icon={Users} tone="primary" />
        <StatCard label="Tiket berjalan" value={openCount} hint="Baru, dikerjakan, menunggu" icon={Wrench} tone="amber" />
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Penjualan voucher 14 hari terakhir</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Nilai voucher terjual per hari</p>
          </div>
          <p className="font-heading text-lg font-bold">
            {formatIDRShort(data.chart.reduce((total, point) => total + point.total, 0))}
          </p>
        </CardHeader>
        <CardContent className="h-[240px] pl-0 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatIDRShort(value)} />
              <Tooltip
                formatter={(value) => [formatIDR(value), 'Penjualan']}
                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-muted-foreground" /> Tiket berjalan
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/tiket">
                Semua tiket <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.openTickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada tiket berjalan.</p>
            ) : (
              data.openTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tiket/${ticket.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ticket.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.customer_name || 'Tanpa pelanggan'} • {ticket.assigned_to_name || 'Belum ditugaskan'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge value={ticket.priority} />
                    <StatusBadge value={ticket.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4 text-muted-foreground" /> Penjualan terbaru
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/voucher">
                Semua voucher <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan voucher.</p>
            ) : (
              data.recentSales.map((voucher) => (
                <div key={voucher.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="code-text truncate text-sm font-medium">{voucher.code}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {voucher.package_name} • {voucher.reseller_name || 'Penjualan langsung'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatIDR(voucher.sold_price || voucher.price)}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(voucher.sold_date)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" /> Aktivitas terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.activities.length === 0 ? (
            <EmptyState icon={Activity} title="Belum ada aktivitas" description="Semua perubahan penting akan tercatat di sini." />
          ) : (
            <ul className="space-y-3">
              {data.activities.map((log) => (
                <li key={log.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <div className="min-w-0">
                    <p className="text-sm">{log.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {log.actor_name} • {formatDate(log.created_date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}