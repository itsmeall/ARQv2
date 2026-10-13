import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatIDR, monthPeriod } from '@/lib/format';

export default function MitraCommission() {
  const { tenant, member, memberId } = useSession();
  const [data, setData] = useState(null);
  const resellerId = memberId || member?.id;
  const rate = member?.commission_rate ?? tenant?.default_commission_rate ?? 0;

  useEffect(() => {
    if (!tenant || !resellerId) return;
    let active = true;

    const load = async () => {
      const base = { tenant_id: tenant.id, reseller_id: resellerId, status: 'sold' };
      const [all, month, perPackage] = await Promise.all([
        base44.entities.Voucher.aggregate({ query: base, sum: ['sold_price', 'commission_amount'] }),
        base44.entities.Voucher.aggregate({ query: { ...base, sold_date: { $gte: `${monthPeriod()}-01` } }, sum: 'commission_amount' }),
        base44.entities.Voucher.aggregate({
          query: base,
          groupBy: 'package_name',
          sum: ['commission_amount', 'sold_price'],
          sort: '-sum_commission_amount',
        }),
      ]);

      if (!active) return;
      setData({
        total: all?.rows?.[0]?.sum_commission_amount || 0,
        revenue: all?.rows?.[0]?.sum_sold_price || 0,
        month: month?.rows?.[0]?.sum_commission_amount || 0,
        rows: perPackage?.rows || [],
      });
    };

    load();
    return () => {
      active = false;
    };
  }, [tenant, resellerId]);

  if (!tenant) return <LoadingScreen />;
  if (!data) return <LoadingScreen label="Menghitung komisi…" />;

  return (
    <>
      <PageHeader title="Komisi saya" description={`Tarif komisi Anda ${rate}% dari harga jual voucher.`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Komisi bulan ini" value={formatIDR(data.month)} icon={Wallet} tone="violet" />
        <StatCard label="Total komisi" value={formatIDR(data.total)} tone="primary" />
        <StatCard label="Nilai penjualan" value={formatIDR(data.revenue)} hint="Dasar perhitungan komisi" tone="emerald" />
      </div>

      {data.rows.length === 0 ? (
        <EmptyState icon={Wallet} title="Belum ada komisi" description="Komisi muncul setelah Anda mencatat penjualan voucher." />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Nilai penjualan</TableHead>
                  <TableHead className="text-right">Komisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.package_name}>
                    <TableCell className="font-medium">{row.package_name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.count}</TableCell>
                    <TableCell className="text-right">{formatIDR(row.sum_sold_price || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(row.sum_commission_amount || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}