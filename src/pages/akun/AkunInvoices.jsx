import { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatIDR, formatIDRShort, formatPeriod } from '@/lib/format';

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'unpaid', label: 'Belum bayar' },
  { value: 'paid', label: 'Lunas' },
];

export default function AkunInvoices() {
  const { customerId } = useSession();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ unpaid: 0, paid: 0 });
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    const query = { customer_id: customerId };
    if (status !== 'all') query.status = status;

    const [page, totals] = await Promise.all([
      base44.entities.Invoice.filter(query, { sort: '-issue_date', limit: 100 }),
      base44.entities.Invoice.aggregate({ query: { customer_id: customerId }, groupBy: 'status', sum: 'total' }),
    ]);

    setItems(page?.items || []);
    const rows = totals?.rows || [];
    setSummary({
      unpaid: rows
        .filter((row) => ['unpaid', 'overdue'].includes(row.status))
        .reduce((total, row) => total + (row.sum_total || 0), 0),
      paid: rows.filter((row) => row.status === 'paid').reduce((total, row) => total + (row.sum_total || 0), 0),
    });
    setLoading(false);
  }, [customerId, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (!customerId) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Tagihan saya" description="Riwayat tagihan layanan internet Anda beserta status pembayaran." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Belum dibayar" value={formatIDRShort(summary.unpaid)} icon={Receipt} tone="rose" />
        <StatCard label="Sudah dibayar" value={formatIDRShort(summary.paid)} tone="emerald" />
        <StatCard label="Jumlah tagihan" value={items.length} hint={status === 'all' ? 'Semua status' : 'Sesuai filter'} tone="primary" />
      </div>

      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          {STATUS_TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingScreen label="Memuat tagihan…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} title="Tidak ada tagihan" description="Tagihan bulanan Anda akan tampil di halaman ini." />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tagihan</TableHead>
                  <TableHead className="hidden sm:table-cell">Terbit</TableHead>
                  <TableHead className="hidden md:table-cell">Jatuh tempo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="code-text font-medium">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{formatPeriod(invoice.period)}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatDate(invoice.issue_date)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(invoice.total)}</TableCell>
                    <TableCell>
                      <StatusBadge value={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}