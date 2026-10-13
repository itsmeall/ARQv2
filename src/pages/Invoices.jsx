import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Receipt, Search, Send, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import InvoiceDialog from '@/components/dialogs/InvoiceDialog';
import PayInvoiceDialog from '@/components/dialogs/PayInvoiceDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addDaysISO, formatDate, formatIDR, formatIDRShort, formatPeriod, monthPeriod } from '@/lib/format';
import { generateMonthlyInvoices } from '@/lib/billing';
import { logActivity } from '@/lib/activity';

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'unpaid', label: 'Belum bayar' },
  { value: 'overdue', label: 'Menunggak' },
  { value: 'paid', label: 'Lunas' },
  { value: 'void', label: 'Dibatalkan' },
];

export default function Invoices() {
  const { tenant, displayName } = useSession();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({ unpaid: 0, paid: 0 });
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const query = { tenant_id: tenant.id };
    if (status !== 'all') query.status = status;
    if (term) {
      query.$or = [
        { invoice_number: { $regex: term, $options: 'i' } },
        { customer_name: { $regex: term, $options: 'i' } },
      ];
    }
    const [page, totals] = await Promise.all([
      base44.entities.Invoice.filter(query, { sort: '-issue_date', limit: 100 }),
      base44.entities.Invoice.aggregate({ query: { tenant_id: tenant.id }, groupBy: 'status', sum: 'total' }),
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
  }, [tenant, status, term]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tenant) return;
    base44.entities.Customer.filter({ tenant_id: tenant.id }, { sort: 'name', limit: 500 }).then((page) =>
      setCustomers(page?.items || []),
    );
  }, [tenant]);

  const generateBulk = async () => {
    setBulkBusy(true);
    try {
      const created = await generateMonthlyInvoices({
        tenant,
        customers,
        period: monthPeriod(),
        dueDate: addDaysISO(7).slice(0, 10),
        actor: displayName,
      });
      setBulkOpen(false);
      load();
    } finally {
      setBulkBusy(false);
    }
  };

  const remove = async (invoice) => {
    await base44.entities.Invoice.delete(invoice.id);
    await logActivity({
      tenantId: tenant.id,
      actor: displayName,
      action: 'invoice_deleted',
      entity: 'Invoice',
      entityId: invoice.id,
      description: `Menghapus tagihan ${invoice.invoice_number}`,
    });
    load();
  };

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Tagihan" description="Buat dan pantau tagihan bulanan pelanggan.">
        <Button variant="outline" onClick={() => setBulkOpen(true)} disabled={!customers.length}>
          <Send className="mr-2 h-4 w-4" /> Tagih semua pelanggan
        </Button>
        <Button onClick={() => setDialog(true)}>
          <Receipt className="mr-2 h-4 w-4" /> Buat tagihan
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Belum dibayar" value={formatIDRShort(summary.unpaid)} hint="Termasuk menunggak" icon={Receipt} tone="rose" />
        <StatCard label="Sudah lunas" value={formatIDRShort(summary.paid)} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Periode berjalan" value={formatPeriod(monthPeriod())} hint={`${customers.length} pelanggan terdaftar`} tone="primary" />
      </div>

      <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor tagihan / pelanggan…" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <LoadingScreen label="Memuat tagihan…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Tidak ada tagihan"
          description="Buat tagihan untuk satu pelanggan, atau tagih semua pelanggan aktif sekaligus."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)} disabled={!customers.length}>
                Tagih semua pelanggan
              </Button>
              <Button onClick={() => setDialog(true)}>Buat tagihan</Button>
            </div>
          }
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tagihan</TableHead>
                  <TableHead className="hidden sm:table-cell">Pelanggan</TableHead>
                  <TableHead className="hidden md:table-cell">Jatuh tempo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="code-text font-medium">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{formatPeriod(invoice.period)}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      <Link to={`/pelanggan/${invoice.customer_id}`} className="hover:text-primary">
                        {invoice.customer_name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(invoice.total)}</TableCell>
                    <TableCell>
                      <StatusBadge value={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {invoice.status !== 'paid' && invoice.status !== 'void' ? (
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPayTarget(invoice)}>
                            Lunasi
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm(invoice)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <InvoiceDialog
        open={dialog}
        onOpenChange={setDialog}
        tenant={tenant}
        actor={displayName}
        customers={customers}
        onSaved={load}
      />

      <PayInvoiceDialog
        open={!!payTarget}
        onOpenChange={(open) => !open && setPayTarget(null)}
        tenant={tenant}
        actor={displayName}
        invoice={payTarget}
        onSaved={load}
      />

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={`Tagih semua pelanggan aktif untuk ${formatPeriod(monthPeriod())}?`}
        description="Tagihan bulanan dibuat otomatis untuk pelanggan aktif yang belum ditagih pada periode ini."
        confirmLabel={bulkBusy ? 'Memproses…' : 'Buat tagihan'}
        destructive={false}
        onConfirm={generateBulk}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Hapus tagihan ${confirm?.invoice_number || ''}?`}
        description="Tagihan akan hilang dari daftar dan laporan."
        onConfirm={() => remove(confirm)}
      />
    </>
  );
}