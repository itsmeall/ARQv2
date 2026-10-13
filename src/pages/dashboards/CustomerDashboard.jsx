import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Receipt, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import LoadingScreen from '@/components/LoadingScreen';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatIDR, formatIDRShort, formatPeriod } from '@/lib/format';

export default function CustomerDashboard() {
  const { tenant, customerId, displayName } = useSession();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!customerId) return;
    let active = true;

    const load = async () => {
      const [summary, list] = await Promise.all([
        base44.entities.Invoice.aggregate({ query: { customer_id: customerId }, groupBy: 'status', sum: 'total' }),
        base44.entities.Invoice.filter({ customer_id: customerId }, { sort: '-issue_date', limit: 10 }),
      ]);

      if (!active) return;
      const rows = summary?.rows || [];
      setData({
        unpaid: rows.filter((row) => ['unpaid', 'overdue'].includes(row.status)).reduce((total, row) => total + (row.sum_total || 0), 0),
        paid: rows.filter((row) => row.status === 'paid').reduce((total, row) => total + (row.sum_total || 0), 0),
        count: rows.reduce((total, row) => total + (row.count || 0), 0),
        list: list?.items || [],
      });
    };

    load();
    return () => {
      active = false;
    };
  }, [customerId]);

  if (!customerId) return <LoadingScreen />;
  if (!data) return <LoadingScreen label="Memuat tagihan Anda…" />;

  const nextDue = data.list.find((invoice) => invoice.status === 'unpaid' || invoice.status === 'overdue');

  return (
    <>
      <PageHeader
        title={`Halo, ${displayName.split(' ')[0]}`}
        description={`Tagihan layanan internet Anda${tenant?.name ? ` di ${tenant.name}` : ''}.`}
      >
        <Button asChild>
          <Link to="/akun/invoice">Semua tagihan</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tagihan belum dibayar" value={formatIDRShort(data.unpaid)} icon={Receipt} tone="rose" />
        <StatCard label="Sudah dibayar" value={formatIDRShort(data.paid)} icon={Wallet} tone="emerald" />
        <StatCard
          label="Jatuh tempo berikutnya"
          value={nextDue ? formatDate(nextDue.due_date) : '—'}
          hint={nextDue ? formatIDR(nextDue.total) : 'Tidak ada tagihan tertunda'}
          icon={CalendarClock}
          tone="amber"
        />
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tagihan terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {data.list.length === 0 ? (
            <EmptyState icon={Receipt} title="Belum ada tagihan" description="Tagihan bulanan Anda akan tampil di sini." />
          ) : (
            <div className="space-y-2">
              {data.list.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="code-text text-sm font-medium">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Periode {formatPeriod(invoice.period)} • jatuh tempo {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold">{formatIDR(invoice.total)}</span>
                    <StatusBadge value={invoice.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}