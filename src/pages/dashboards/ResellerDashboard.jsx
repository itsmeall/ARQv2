import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Ticket, TrendingUp, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LoadingScreen from '@/components/LoadingScreen';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatIDR, formatIDRShort, monthPeriod } from '@/lib/format';

export default function ResellerDashboard() {
  const { tenant, member, memberId, displayName } = useSession();
  const [data, setData] = useState(null);
  const resellerId = memberId || member?.id;

  useEffect(() => {
    if (!tenant || !resellerId) return;
    let active = true;

    const load = async () => {
      const [stock, sales, rows] = await Promise.all([
        base44.entities.ResellerStock.aggregate({
          query: { tenant_id: tenant.id, reseller_id: resellerId },
          sum: ['quantity_remaining', 'quantity_sold'],
        }),
        base44.entities.Voucher.aggregate({
          query: { tenant_id: tenant.id, reseller_id: resellerId, status: 'sold', sold_date: { $gte: `${monthPeriod()}-01` } },
          sum: ['sold_price', 'commission_amount'],
        }),
        base44.entities.ResellerStock.filter(
          { tenant_id: tenant.id, reseller_id: resellerId },
          { sort: 'package_name', limit: 10 },
        ),
      ]);

      if (!active) return;
      setData({
        remaining: stock?.rows?.[0]?.sum_quantity_remaining || 0,
        soldTotal: stock?.rows?.[0]?.sum_quantity_sold || 0,
        monthSales: sales?.rows?.[0]?.sum_sold_price || 0,
        monthCommission: sales?.rows?.[0]?.sum_commission_amount || 0,
        rows: rows?.items || [],
      });
    };

    load();
    return () => {
      active = false;
    };
  }, [tenant, resellerId]);

  if (!tenant) return <LoadingScreen />;
  if (!data) return <LoadingScreen label="Memuat stok Anda…" />;

  return (
    <>
      <PageHeader
        title={`Halo, ${displayName.split(' ')[0]}`}
        description={`Stok dan penjualan voucher Anda di ${tenant.name}.`}
      >
        <Button asChild>
          <Link to="/mitra/stok">Lihat stok</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Stok tersisa" value={data.remaining} hint="Voucher siap dijual" icon={Boxes} tone="sky" />
        <StatCard label="Total terjual" value={data.soldTotal} hint="Sepanjang waktu" icon={Ticket} tone="emerald" />
        <StatCard label="Penjualan bulan ini" value={formatIDRShort(data.monthSales)} icon={TrendingUp} tone="primary" />
        <StatCard label="Komisi bulan ini" value={formatIDR(data.monthCommission)} icon={Wallet} tone="violet" />
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Stok per paket</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/mitra/penjualan">Riwayat penjualan</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Boxes}
                title="Belum ada stok"
                description="Minta admin mengalokasikan voucher untuk Anda."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Komisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.package_name}</TableCell>
                    <TableCell className="text-right">{row.quantity_remaining || 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.quantity_sold || 0}</TableCell>
                    <TableCell className="text-right">{formatIDR(row.price)}</TableCell>
                    <TableCell className="text-right">{row.commission_rate ?? 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}