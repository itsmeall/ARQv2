import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import LoadingScreen from '@/components/LoadingScreen';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';

export default function TechnicianDashboard() {
  const { tenant, member, memberId, displayName } = useSession();
  const [data, setData] = useState(null);
  const technicianId = memberId || member?.id;

  useEffect(() => {
    if (!tenant || !technicianId) return;
    let active = true;

    const load = async () => {
      const [counts, list, done] = await Promise.all([
        base44.entities.Ticket.aggregate({ query: { tenant_id: tenant.id, assigned_to: technicianId }, groupBy: 'status' }),
        base44.entities.Ticket.filter(
          { tenant_id: tenant.id, assigned_to: technicianId, status: { $in: ['open', 'in_progress', 'waiting'] } },
          { sort: 'priority', limit: 10 },
        ),
        base44.entities.Ticket.count({
          tenant_id: tenant.id,
          assigned_to: technicianId,
          status: { $in: ['resolved', 'closed'] },
        }),
      ]);

      if (!active) return;
      const byStatus = Object.fromEntries((counts?.rows || []).map((row) => [row.status, row.count]));
      setData({
        active: (byStatus.open || 0) + (byStatus.in_progress || 0) + (byStatus.waiting || 0),
        waiting: byStatus.waiting || 0,
        done,
        list: list?.items || [],
      });
    };

    load();
    return () => {
      active = false;
    };
  }, [tenant, technicianId]);

  if (!tenant) return <LoadingScreen />;
  if (!data) return <LoadingScreen label="Memuat tiket Anda…" />;

  return (
    <>
      <PageHeader title={`Halo, ${displayName.split(' ')[0]}`} description={`Tugas lapangan Anda di ${tenant.name}.`}>
        <Button asChild>
          <Link to="/teknisi/tiket">Semua tiket saya</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tiket aktif" value={data.active} hint="Baru, dikerjakan, menunggu" icon={Wrench} tone="primary" />
        <StatCard label="Menunggu" value={data.waiting} hint="Perlu tindak lanjut" icon={Clock} tone="amber" />
        <StatCard label="Selesai" value={data.done} hint="Sepanjang waktu" icon={CheckCircle2} tone="emerald" />
      </div>

      <Card className="mt-6 border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prioritas hari ini</CardTitle>
        </CardHeader>
        <CardContent>
          {data.list.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tidak ada tiket aktif" description="Semua tugas Anda sudah selesai." />
          ) : (
            <div className="space-y-2">
              {data.list.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/teknisi/tiket`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ticket.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.customer_name || 'Tanpa pelanggan'} • {formatDate(ticket.created_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge value={ticket.priority} />
                    <StatusBadge value={ticket.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}