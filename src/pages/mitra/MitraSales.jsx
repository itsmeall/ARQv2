import { useCallback, useEffect, useState } from 'react';
import { Search, Ticket } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatIDR, monthPeriod } from '@/lib/format';

export default function MitraSales() {
  const { tenant, member, memberId } = useSession();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ revenue: 0, commission: 0, month: 0 });
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const resellerId = memberId || member?.id;

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenant || !resellerId) return;
    setLoading(true);
    const query = { tenant_id: tenant.id, reseller_id: resellerId, status: 'sold' };
    if (term) query.code = { $regex: term, $options: 'i' };

    const [page, all, month] = await Promise.all([
      base44.entities.Voucher.filter(query, { sort: '-sold_date', limit: 100 }),
      base44.entities.Voucher.aggregate({
        query: { tenant_id: tenant.id, reseller_id: resellerId, status: 'sold' },
        sum: ['sold_price', 'commission_amount'],
      }),
      base44.entities.Voucher.aggregate({
        query: { tenant_id: tenant.id, reseller_id: resellerId, status: 'sold', sold_date: { $gte: `${monthPeriod()}-01` } },
        sum: 'sold_price',
      }),
    ]);

    setRows(page?.items || []);
    setTotals({
      revenue: all?.rows?.[0]?.sum_sold_price || 0,
      commission: all?.rows?.[0]?.sum_commission_amount || 0,
      month: month?.rows?.[0]?.sum_sold_price || 0,
    });
    setLoading(false);
  }, [tenant, resellerId, term]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Penjualan saya" description="Riwayat voucher yang Anda jual beserta komisinya." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total penjualan" value={formatIDR(totals.revenue)} tone="primary" />
        <StatCard label="Penjualan bulan ini" value={formatIDR(totals.month)} tone="emerald" />
        <StatCard label="Total komisi" value={formatIDR(totals.commission)} tone="violet" />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode voucher…" className="pl-9 font-mono uppercase" />
      </div>

      {loading ? (
        <LoadingScreen label="Memuat penjualan…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Ticket} title="Belum ada penjualan" description="Catat penjualan dari menu Stok Saya setiap kali voucher terjual." />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead className="hidden sm:table-cell">Paket</TableHead>
                  <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Komisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="code-text font-medium">{voucher.code}</TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{voucher.package_name}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDate(voucher.sold_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(voucher.sold_price || voucher.price)}</TableCell>
                    <TableCell className="text-right">{formatIDR(voucher.commission_amount || 0)}</TableCell>
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