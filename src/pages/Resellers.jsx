import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import MemberDialog from '@/components/dialogs/MemberDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Resellers() {
  const { tenant, displayName } = useSession();
  const [members, setMembers] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, member: null });

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const [list, stock] = await Promise.all([
      base44.entities.TenantMember.filter(
        { tenant_id: tenant.id, app_role: 'reseller' },
        { sort: 'name', limit: 100 },
      ),
      base44.entities.ResellerStock.aggregate({
        query: { tenant_id: tenant.id },
        groupBy: 'reseller_id',
        sum: ['quantity_remaining', 'quantity_sold'],
      }),
    ]);
    setMembers(list?.items || []);
    setStockMap(
      Object.fromEntries(
        (stock?.rows || []).map((row) => [
          row.reseller_id,
          { remaining: row.sum_quantity_remaining || 0, sold: row.sum_quantity_sold || 0 },
        ]),
      ),
    );
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Reseller" description="Kelola mitra penjual voucher, alokasi stok, dan komisi mereka.">
        <Button onClick={() => setDialog({ open: true, member: null })}>
          <Plus className="mr-2 h-4 w-4" /> Tambah reseller
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingScreen label="Memuat reseller…" />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Belum ada reseller"
          description="Tambahkan mitra penjual, lalu alokasikan stok voucher kepada mereka."
          action={
            <Button onClick={() => setDialog({ open: true, member: null })}>
              <Plus className="mr-2 h-4 w-4" /> Tambah reseller
            </Button>
          }
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reseller</TableHead>
                  <TableHead className="hidden sm:table-cell">Kontak</TableHead>
                  <TableHead className="text-right">Stok sisa</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Komisi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const stock = stockMap[member.id] || { remaining: 0, sold: 0 };
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link to={`/reseller/${member.id}`} className="font-medium hover:text-primary">
                          {member.name || member.email}
                        </Link>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {member.phone || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{stock.remaining}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{stock.sold}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {member.commission_rate ?? tenant.default_commission_rate ?? 0}%
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={member.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <MemberDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, member: open ? dialog.member : null })}
        tenant={tenant}
        member={dialog.member}
        defaultRole="reseller"
        onSaved={load}
      />
    </>
  );
}