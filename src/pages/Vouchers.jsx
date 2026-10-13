import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, Search, Ticket, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import VoucherBatchDialog from '@/components/dialogs/VoucherBatchDialog';
import SellVoucherDialog from '@/components/dialogs/SellVoucherDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCSV, formatDate, formatIDR, isExpired } from '@/lib/format';
import { voidVoucher } from '@/lib/vouchers';

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'available', label: 'Tersedia' },
  { value: 'allocated', label: 'Di reseller' },
  { value: 'sold', label: 'Terjual' },
  { value: 'void', label: 'Hangus' },
];

export default function Vouchers() {
  const { tenant, displayName } = useSession();
  const [tab, setTab] = useState('batch');
  const [batches, setBatches] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [status, setStatus] = useState('available');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [batchDialog, setBatchDialog] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadBatches = useCallback(async () => {
    if (!tenant) return;
    const page = await base44.entities.VoucherBatch.filter({ tenant_id: tenant.id }, { sort: '-created_date', limit: 50 });
    setBatches(page?.items || []);
  }, [tenant]);

  const loadVouchers = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const query = { tenant_id: tenant.id };
    if (status !== 'all') query.status = status;
    if (term) query.code = { $regex: term, $options: 'i' };
    const page = await base44.entities.Voucher.filter(query, { sort: '-created_date', limit: 100 });
    setVouchers(page?.items || []);
    setLoading(false);
  }, [tenant, status, term]);

  const loadPackages = useCallback(async () => {
    if (!tenant) return;
    const page = await base44.entities.Package.filter({ tenant_id: tenant.id, status: 'active' }, { sort: 'name', limit: 100 });
    setPackages(page?.items || []);
  }, [tenant]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (tab === 'voucher') loadVouchers();
  }, [tab, loadVouchers]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const exportCSV = () => {
    downloadCSV(
      `voucher-${tenant.code || 'arq'}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Kode', 'Paket', 'Status', 'Harga', 'Kadaluarsa', 'Reseller'],
      vouchers.map((voucher) => [
        voucher.code,
        voucher.package_name,
        voucher.status,
        voucher.sold_price || voucher.price,
        voucher.expiry_date ? voucher.expiry_date.slice(0, 10) : '',
        voucher.reseller_name || '',
      ]),
    );
  };

  const destroy = async (voucher) => {
    await voidVoucher({ tenant, voucher, actor: displayName });
    loadVouchers();
  };

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Voucher" description="Generate batch voucher, pantau stok, dan catat penjualan.">
        <Button variant="outline" onClick={exportCSV} disabled={tab !== 'voucher' || vouchers.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
        <Button onClick={() => setBatchDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Generate batch
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="batch">Batch voucher</TabsTrigger>
          <TabsTrigger value="voucher">Daftar voucher</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'batch' ? (
        batches.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Belum ada batch voucher"
            description="Buat batch pertama Anda — kode voucher akan dibuat otomatis dan langsung masuk stok."
            action={
              <Button onClick={() => setBatchDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Generate batch
              </Button>
            }
          />
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead className="hidden sm:table-cell">Paket</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="hidden md:table-cell">Masa berlaku</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Link to={`/voucher/batch/${batch.id}`} className="font-medium hover:text-primary">
                          {batch.name || `Batch ${batch.prefix || ''}`}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatDate(batch.created_date)}</p>
                      </TableCell>
                      <TableCell className="hidden text-sm sm:table-cell">{batch.package_name}</TableCell>
                      <TableCell className="text-right">{batch.quantity}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{batch.expiry_hours} jam</TableCell>
                      <TableCell>
                        <StatusBadge value={batch.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode voucher…" className="pl-9 font-mono uppercase" />
            </div>
          </div>

          {loading ? (
            <LoadingScreen label="Memuat voucher…" />
          ) : vouchers.length === 0 ? (
            <EmptyState icon={Ticket} title="Tidak ada voucher" description="Ubah filter status atau generate batch voucher baru." />
          ) : (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead className="hidden sm:table-cell">Paket</TableHead>
                      <TableHead className="hidden lg:table-cell">Kadaluarsa</TableHead>
                      <TableHead className="hidden md:table-cell">Reseller</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="code-text font-medium">{voucher.code}</TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">{voucher.package_name}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDate(voucher.expiry_date)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {voucher.reseller_name || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatIDR(voucher.sold_price || voucher.price)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            value={
                              voucher.status === 'available' && isExpired(voucher.expiry_date) ? 'expired' : voucher.status
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {voucher.status === 'available' ? (
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSellTarget(voucher)}>
                                Jual
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setConfirm(voucher)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <VoucherBatchDialog
        open={batchDialog}
        onOpenChange={setBatchDialog}
        tenant={tenant}
        actor={displayName}
        packages={packages}
        onSaved={() => {
          loadBatches();
          if (tab === 'voucher') loadVouchers();
        }}
      />

      <SellVoucherDialog
        open={!!sellTarget}
        onOpenChange={(open) => !open && setSellTarget(null)}
        tenant={tenant}
        actor={displayName}
        voucher={sellTarget}
        onSaved={loadVouchers}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Hanguskan voucher ${confirm?.code || ''}?`}
        description="Voucher tidak bisa dipakai lagi. Tindakan ini tercatat di riwayat aktivitas."
        confirmLabel="Hanguskan"
        onConfirm={() => destroy(confirm)}
      />
    </>
  );
}