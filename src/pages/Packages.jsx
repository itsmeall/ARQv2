import { useCallback, useEffect, useState } from 'react';
import { Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import PackageDialog from '@/components/dialogs/PackageDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logActivity } from '@/lib/activity';
import { formatIDR } from '@/lib/format';

export default function Packages() {
  const { tenant, displayName } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [dialog, setDialog] = useState({ open: false, pkg: null });
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const query = { tenant_id: tenant.id };
    if (term) query.name = { $regex: term, $options: 'i' };
    const page = await base44.entities.Package.filter(query, { sort: 'name', limit: 100 });
    setItems(page?.items || []);
    setLoading(false);
  }, [tenant, term]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (pkg) => {
    await base44.entities.Package.delete(pkg.id);
    await logActivity({
      tenantId: tenant.id,
      actor: displayName,
      action: 'package_deleted',
      entity: 'Package',
      entityId: pkg.id,
      description: `Menghapus paket ${pkg.name}`,
    });
    load();
  };

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Paket & harga" description="Atur paket voucher hotspot dan langganan PPPoE yang Anda jual.">
        <Button onClick={() => setDialog({ open: true, pkg: null })}>
          <Plus className="mr-2 h-4 w-4" /> Paket baru
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama paket…" className="pl-9" />
      </div>

      {loading ? (
        <LoadingScreen label="Memuat paket…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Belum ada paket"
          description="Tambahkan paket pertama Anda, misalnya Hotspot 1 Hari Rp5.000 atau PPPoE 10 Mbps."
          action={
            <Button onClick={() => setDialog({ open: true, pkg: null })}>
              <Plus className="mr-2 h-4 w-4" /> Paket baru
            </Button>
          }
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead className="hidden sm:table-cell">Jenis</TableHead>
                  <TableHead className="hidden md:table-cell">Masa aktif</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Modal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[110px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.quota_label || pkg.description || '—'}
                        {pkg.speed_mbps ? ` • ${pkg.speed_mbps} Mbps` : ''}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge value={pkg.service_type} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {pkg.duration_hours ? `${pkg.duration_hours} jam` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(pkg.price)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatIDR(pkg.cost || 0)}</TableCell>
                    <TableCell>
                      <StatusBadge value={pkg.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, pkg })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm(pkg)}>
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

      <PackageDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, pkg: open ? dialog.pkg : null })}
        tenant={tenant}
        actor={displayName}
        pkg={dialog.pkg}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Hapus paket ${confirm?.name || ''}?`}
        description="Voucher dan pelanggan yang sudah memakai paket ini tidak akan terhapus."
        onConfirm={() => remove(confirm)}
      />
    </>
  );
}