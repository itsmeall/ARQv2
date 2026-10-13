import { useCallback, useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import RecordSaleDialog from '@/components/dialogs/RecordSaleDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatIDR } from '@/lib/format';

export default function MitraStock() {
  const { tenant, member, memberId, displayName } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saleStock, setSaleStock] = useState(null);
  const resellerId = memberId || member?.id;

  const load = useCallback(async () => {
    if (!tenant || !resellerId) return;
    setLoading(true);
    const page = await base44.entities.ResellerStock.filter(
      { tenant_id: tenant.id, reseller_id: resellerId },
      { sort: 'package_name', limit: 100 },
    );
    setRows(page?.items || []);
    setLoading(false);
  }, [tenant, resellerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tenant) return <LoadingScreen />;

  const remaining = rows.reduce((total, row) => total + (row.quantity_remaining || 0), 0);
  const sold = rows.reduce((total, row) => total + (row.quantity_sold || 0), 0);

  return (
    <>
      <PageHeader title="Stok saya" description="Voucher yang dialokasikan untuk Anda, siap dijual ke pelanggan." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Stok tersisa" value={remaining} icon={Boxes} tone="sky" />
        <StatCard label="Sudah terjual" value={sold} tone="emerald" />
        <StatCard label="Jenis paket" value={rows.length} tone="primary" />
      </div>

      {loading ? (
        <LoadingScreen label="Memuat stok…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title="Belum ada stok" description="Hubungi admin untuk alokasi voucher ke akun Anda." />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Harga</TableHead>
                  <TableHead className="hidden md:table-cell">Mutasi terakhir</TableHead>
                  <TableHead className="w-[130px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.package_name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.quantity_in || 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.quantity_sold || 0}</TableCell>
                    <TableCell className="text-right font-medium">{row.quantity_remaining || 0}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">{formatIDR(row.price)}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(row.last_mutation_date)}
                    </TableCell>
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
          </CardContent>
        </Card>
      )}

      <RecordSaleDialog
        open={!!saleStock}
        onOpenChange={(open) => !open && setSaleStock(null)}
        tenant={tenant}
        reseller={member}
        stock={saleStock}
        actor={displayName}
        onSaved={load}
      />
    </>
  );
}