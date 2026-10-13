import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Play, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/format';
import { logActivity } from '@/lib/activity';

const STATUS_TABS = [
  { value: 'active', label: 'Aktif' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'waiting', label: 'Menunggu' },
  { value: 'resolved', label: 'Selesai' },
];

export default function TeknisiTickets() {
  const { tenant, member, memberId, displayName } = useSession();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const technicianId = memberId || member?.id;

  const load = useCallback(async () => {
    if (!tenant || !technicianId) return;
    setLoading(true);
    const query = { tenant_id: tenant.id, assigned_to: technicianId };
    if (status === 'active') query.status = { $in: ['open', 'in_progress', 'waiting'] };
    else query.status = status;
    const page = await base44.entities.Ticket.filter(query, { sort: '-created_date', limit: 100 });
    setItems(page?.items || []);
    setLoading(false);
  }, [tenant, technicianId, status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (ticket, next) => {
    await base44.entities.Ticket.update(ticket.id, {
      status: next,
      resolved_date: next === 'resolved' ? new Date().toISOString() : ticket.resolved_date,
    });
    await logActivity({
      tenantId: tenant.id,
      actor: displayName,
      action: 'ticket_updated',
      entity: 'Ticket',
      entityId: ticket.id,
      description: `Tiket ${ticket.ticket_number} diubah menjadi ${next}`,
    });
    load();
  };

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Tiket saya" description="Tugas gangguan yang ditugaskan ke Anda." />

      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingScreen label="Memuat tiket…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Wrench} title="Tidak ada tiket" description="Belum ada tugas pada kategori ini." />
      ) : (
        <div className="space-y-3">
          {items.map((ticket) => (
            <Card key={ticket.id} className="border-border/70 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={ticket.priority} />
                    <StatusBadge value={ticket.status} />
                    <span className="code-text text-[11px] text-muted-foreground">{ticket.ticket_number}</span>
                  </div>
                  <p className="font-medium">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.customer_name || 'Tanpa pelanggan'} • {ticket.category} • {formatDateTime(ticket.created_date)}
                  </p>
                  {ticket.description ? (
                    <p className="max-w-2xl text-sm text-muted-foreground">{ticket.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {ticket.status === 'open' || ticket.status === 'waiting' ? (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(ticket, 'in_progress')}>
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Mulai
                    </Button>
                  ) : null}
                  {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                    <Button size="sm" onClick={() => updateStatus(ticket, 'resolved')}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Selesaikan
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}