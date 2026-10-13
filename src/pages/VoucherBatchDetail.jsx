import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Search, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCSV, formatDate, formatDateTime, formatIDR, isExpired } from '@/lib/format';
import { logActivity } from '@/lib/activity';

export default function VoucherBatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { tenant, displayName } = useSession();
  const [batch, setBatch] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenant || !batchId) return;
    setLoading(true);
    const [record, page] = await Promise.all([
      base44.entities.VoucherBatch.get(batchId),
      base44.entities.Voucher.filter(
        term ? { batch_id: batchId, code: { $regex: term, $options: 'i' } } : { batch_id: batchId },
        { sort: 'code', limit: 500 },
      ),
    ]);
    setBatch(record);
    setVouchers(page?.items || []);
    setLoading(false);
  }, [tenant, batchId, term]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSV = () => {
    downloadCSV(
      `batch-${batch?.prefix || 'voucher'}-${(batch?.name || 'batch').replace(/\s+/g, '-').toLowerCase()}.csv`,
      ['Kode', 'Paket', 'Status', 'Harga', 'Kadaluarsa'],
      vouchers.map((voucher) => [
        voucher.code,
        voucher.package_name,
        voucher.status,
        voucher.price,
        voucher.expiry_date ? voucher.expiry_date.slice(0, 10) : '',
      ]),
    );
  };

  const destroy = async () => {
    await base44.entities.Voucher.deleteMany({ batch_id: batchId });
    await base44.entities.VoucherBatch.delete(batchId);
    await logActivity({
      tenantId: tenant.id,
      actor: displayName,
      action: 'voucher_batch_deleted',
      entity: 'VoucherBatch',
      entityId: batchId,
      description: `Menghapus batch voucher ${batch?.name || batch?.prefix || ''}`,
    });
    navigate('/voucher');
  };

  if (!tenant) return <LoadingScreen />;
  if (loading && !batch) return <LoadingScreen label="Memuat batch…" />;
  if (!batch) return <LoadingScreen label="Batch tidak ditemukan." />;

  const sold = vouchers.filter((voucher) => voucher.status === 'sold').length;

  return (
    <>
      <PageHeader title={batch.name || `Batch ${batch.prefix || ''}`} description={`${batch.package_name} • dibuat ${formatDateTime(batch.created_date)}`}>
        <Button variant="ghost" asChild>
          <Link to="/voucher">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <Button variant="outline" onClick={exportCSV} disabled={vouchers.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
        <Button variant="outline" className="text-destructive" onClick={() => setConfirm(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Hapus batch
        </Button>
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Jumlah kode', value: batch.quantity },
          { label: 'Harga per voucher', value: formatIDR(batch.price) },
          { label: 'Terjual', value: `${sold} / ${vouchers.length}` },
          { label: 'Masa berlaku', value: `${batch.expiry_hours} jam` },
        ].map((item) => (
          <Card key={item.label} className="border-border/70 shadow-sm">
            <CardContent className="px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-heading text-lg font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode…" className="pl-9 font-mono uppercase" />
      </div>

      {vouchers.length === 0 ? (
        <EmptyState icon={Search} title="Voucher tidak ditemukan" description="Coba kata kunci lain." />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Kadaluarsa</TableHead>
                  <TableHead className="hidden md:table-cell">Reseller</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="code-text font-medium">{voucher.code}</TableCell>
                    <TableCell>
                      <StatusBadge
                        value={voucher.status === 'available' && isExpired(voucher.expiry_date) ? 'expired' : voucher.status}
                      />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatDate(voucher.expiry_date)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {voucher.reseller_name || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{voucher.sold_date ? formatDate(voucher.sold_date) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Hapus batch voucher ini?"
        description={`${vouchers.length} kode voucher pada batch ini akan dihapus permanen.`}
        onConfirm={destroy}
      />
    </>
  );
}