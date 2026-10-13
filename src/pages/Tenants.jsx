import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import TenantDialog from '@/components/dialogs/TenantDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';

export default function Tenants() {
  const { displayName } = useSession();
  const [items, setItems] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, tenant: null });

  const load = useCallback(async () => {
    setLoading(true);
    const [page, members] = await Promise.all([
      base44.entities.Tenant.list({ sort: 'name', limit: 100 }),
      base44.entities.TenantMember.aggregate({ groupBy: 'tenant_id' }),
    ]);
    setItems(page?.items || []);
    setMemberCounts(
      Object.fromEntries((members?.rows || []).map((row) => [row.tenant_id, row.count || 0])),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = items.filter((tenant) => tenant.status === 'active').length;
  const totalMembers = Object.values(memberCounts).reduce((total, count) => total + count, 0);

  return (
    <>
      <PageHeader title="Perusahaan" description="Kelola perusahaan yang memakai platform ARQ beserta anggotanya.">
        <Button onClick={() => setDialog({ open: true, tenant: null })}>
          <Plus className="mr-2 h-4 w-4" /> Perusahaan baru
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total perusahaan" value={items.length} icon={Building2} tone="primary" />
        <StatCard label="Aktif" value={active} hint="Sedang beroperasi" tone="emerald" />
        <StatCard label="Total anggota" value={totalMembers} hint="Admin, reseller, teknisi, pelanggan" icon={Users} tone="violet" />
      </div>

      {loading ? (
        <LoadingScreen label="Memuat perusahaan…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum ada perusahaan"
          description="Tambahkan perusahaan pertama, lalu undang adminnya untuk mulai mengelola voucher."
          action={<Button onClick={() => setDialog({ open: true, tenant: null })}>Perusahaan baru</Button>}
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead className="hidden sm:table-cell">Penanggung jawab</TableHead>
                  <TableHead className="hidden md:table-cell">Kontak</TableHead>
                  <TableHead className="text-right">Anggota</TableHead>
                  <TableHead className="hidden sm:table-cell">Paket</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Link to={`/perusahaan/${tenant.id}`} className="font-medium hover:text-primary">
                        {tenant.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{tenant.code}</span> • sejak {formatDate(tenant.created_date)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{tenant.owner_name || '—'}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {tenant.contact_phone || tenant.contact_email || '—'}
                    </TableCell>
                    <TableCell className="text-right">{memberCounts[tenant.id] || 0}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge value={tenant.plan} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={tenant.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TenantDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, tenant: open ? dialog.tenant : null })}
        tenant={dialog.tenant}
        actor={displayName}
        onSaved={load}
      />
    </>
  );
}