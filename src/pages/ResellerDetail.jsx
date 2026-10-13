import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, Pencil, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import MemberDialog from '@/components/dialogs/MemberDialog';
import AllocateStockDialog from '@/components/dialogs/AllocateStockDialog';
import RecordSaleDialog from '@/components/dialogs/RecordSaleDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime, formatIDR, formatIDRShort } from '@/lib/format';

export default function ResellerDetail() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { tenant, displayName } = useSession();
  const [member, setMember] = useState(null);
  const [data, setData] = useState(null);
  const [packages, setPackages] = useState([]);
  const [allocate, setAllocate] = useState(false);
  const [saleStock, setSaleStock] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    if (!tenant || !memberId) return;
    const [record, stock, mutations, sales, totals, pkgs] = await Promise.all([
      base44.entities.TenantMember.get(memberId),
      base44.entities.ResellerStock.filter({ tenant_id: tenant.id, reseller_id: memberId }, { sort: 'package_name', limit: 50 }),
      base44.entities.StockMutation.filter({ tenant_id: tenant.id, reseller_id: memberId }, { sort: '-created_date', limit: 15 }),
      base44.entities.Voucher.filter({ tenant_id: tenant.id, reseller_id: memberId, status: 'sold' }, { sort: '-sold_date', limit: 15 }),
      base44.entities.Voucher.aggregate({ query: { tenant_id: tenant.id, reseller_id: memberId, status: 'sold' }, sum: ['sold_price', 'commission_amount'] }),
      base44.entities.Package.filter({ tenant_id: tenant.id, status: 'active' }, { sort: 'name', limit: 100 }),
    ]);
    setMember(record);
    setPackages(pkgs?.items || []);
    setData({
      stock: stock?.items || [],
      mutations: mutations?.items || [],
      sales: sales?.items || [],
      revenue: totals?.rows?.[0]?.sum_sold_price || 0,
      commission: totals?.rows?.[0]?.sum_commission_amount || 0,
    });
  }, [tenant, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    await base44.functions.invoke('manageMember', {
      action: 'remove',
      tenant_id: tenant.id,
      email: member.email,
    });
    navigate('/reseller');
  };

  if (!tenant) return <LoadingScreen />;
  if (!member || !data) return <LoadingScreen label="Memuat data reseller…" />;

  const remaining = data.stock.reduce((total, row) => total + (row.quantity_remaining || 0), 0);

  return (
    <>
      <PageHeader title={member.name || member.email} description={`${member.email}${member.phone ? ` • ${member.phone}` : ''}`}>
        <Button variant="ghost" asChild>
          <Link to="/reseller">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setEditDialog(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Ubah akses
        </Button>
        <Button onClick={() => setAllocate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Alokasi stok
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Stok tersisa" value={remaining} icon={Boxes} tone="sky" />
        <StatCard label="Total penjualan" value={formatIDRShort(data.revenue)} icon={Boxes} tone="primary" />
        <StatCard label="Komisi terkumpul" value={formatIDR(data.commission)} hint={`Tarif ${member.commission_rate ?? tenant.default_commission_rate ?? 0}%`} tone="violet" />
        <StatCard label="Status akses" value={<StatusBadge value={member.status} />} tone="emerald" />
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stok per paket</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.stock.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Boxes} title="Belum ada stok" description="Alokasikan voucher agar reseller bisa mulai menjual." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Harga</TableHead>
                  <TableHead className="w-[120px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stock.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.package_name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.quantity_in || 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.quantity_sold || 0}</TableCell>
                    <TableCell className="text-right font-medium">{row.quantity_remaining || 0}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">{formatIDR(row.price)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!row.quantity_remaining}
                        onClick={() => setSaleStock(row)}
                      >
                        Catat penjualan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Penjualan terakhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.sales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan.</p>
            ) : (
              data.sales.map((voucher) => (
                <div key={voucher.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="code-text truncate text-sm font-medium">{voucher.code}</p>
                    <p className="truncate text-xs text-muted-foreground">{voucher.package_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatIDR(voucher.sold_price || voucher.price)}</p>
                    <p className="text-[11px] text-muted-foreground">Komisi {formatIDR(voucher.commission_amount || 0)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Riwayat mutasi stok</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mutations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada mutasi stok.</p>
            ) : (
              <ul className="space-y-3">
                {data.mutations.map((mutation) => (
                  <li key={mutation.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <StatusBadge value={mutation.type} />{' '}
                        <span className="ml-1 font-medium">
                          {mutation.quantity} × {mutation.package_name}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {mutation.actor_name} • {formatDateTime(mutation.created_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">{formatIDR(mutation.amount || 0)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" className="text-destructive" onClick={() => setConfirmRemove(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Hapus akses reseller
        </Button>
      </div>

      <MemberDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        tenant={tenant}
        member={member}
        defaultRole="reseller"
        onSaved={load}
      />

      <AllocateStockDialog
        open={allocate}
        onOpenChange={setAllocate}
        tenant={tenant}
        reseller={member}
        packages={packages}
        actor={displayName}
        onSaved={load}
      />

      <RecordSaleDialog
        open={!!saleStock}
        onOpenChange={(open) => !open && setSaleStock(null)}
        tenant={tenant}
        reseller={member}
        stock={saleStock}
        actor={displayName}
        onSaved={load}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Hapus akses ${member.name || member.email}?`}
        description="Anggota tidak bisa login lagi. Data stok dan penjualannya tetap tersimpan."
        confirmLabel="Hapus akses"
        onConfirm={remove}
      />
    </>
  );
}