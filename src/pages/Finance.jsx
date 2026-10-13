import { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import FinanceDialog from '@/components/dialogs/FinanceDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatIDR, formatIDRShort, formatPeriod, monthPeriod } from '@/lib/format';

const nextPeriod = (period) => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function Finance() {
  const { tenant, displayName } = useSession();
  const [period, setPeriod] = useState(monthPeriod());
  const [type, setType] = useState('all');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, entry: null });
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const range = { $gte: `${period}-01`, $lt: `${nextPeriod(period)}-01` };
    const listQuery = { tenant_id: tenant.id, date: range };
    if (type !== 'all') listQuery.type = type;

    const [page, totals] = await Promise.all([
      base44.entities.Finance.filter(listQuery, { sort: '-date', limit: 200 }),
      base44.entities.Finance.aggregate({
        query: { tenant_id: tenant.id, date: range },
        groupBy: 'type',
        sum: 'amount',
      }),
    ]);

    setItems(page?.items || []);
    const rows = totals?.rows || [];
    setSummary({
      income: rows.find((row) => row.type === 'income')?.sum_amount || 0,
      expense: rows.find((row) => row.type === 'expense')?.sum_amount || 0,
    });
    setLoading(false);
  }, [tenant, period, type]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (entry) => {
    await base44.entities.Finance.delete(entry.id);
    load();
  };

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Keuangan" description="Rekap pemasukan voucher, tagihan, dan pengeluaran operasional.">
        <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="w-[160px]" />
        <Button onClick={() => setDialog({ open: true, entry: null })}>
          <Plus className="mr-2 h-4 w-4" /> Catat transaksi
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pemasukan" value={formatIDRShort(summary.income)} hint={formatPeriod(period)} tone="emerald" />
        <StatCard label="Pengeluaran" value={formatIDRShort(summary.expense)} hint={formatPeriod(period)} tone="rose" />
        <StatCard
          label="Saldo bersih"
          value={formatIDRShort(summary.income - summary.expense)}
          hint="Pemasukan dikurangi pengeluaran"
          icon={Wallet}
          tone="primary"
        />
      </div>

      <Tabs value={type} onValueChange={setType} className="mb-4 mt-6">
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingScreen label="Memuat transaksi…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada transaksi"
          description={`Tidak ada catatan keuangan pada ${formatPeriod(period)}.`}
          action={<Button onClick={() => setDialog({ open: true, entry: null })}>Catat transaksi</Button>}
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="w-[70px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{entry.description || entry.category || '—'}</p>
                      {entry.reference ? <p className="code-text text-xs text-muted-foreground">{entry.reference}</p> : null}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{entry.category || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge value={entry.type} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(entry.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive"
                        onClick={() => setConfirm(entry)}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <FinanceDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, entry: open ? dialog.entry : null })}
        tenant={tenant}
        actor={displayName}
        entry={dialog.entry}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Hapus transaksi ini?"
        description={`${confirm?.description || confirm?.category || 'Transaksi'} akan dihapus dari laporan keuangan.`}
        onConfirm={() => remove(confirm)}
      />
    </>
  );
}