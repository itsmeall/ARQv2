import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import TicketDialog from '@/components/dialogs/TicketDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'open', label: 'Baru' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'waiting', label: 'Menunggu' },
  { value: 'resolved', label: 'Selesai' },
];

export default function Tickets() {
  const { tenant, displayName } = useSession();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const query = { tenant_id: tenant.id };
    if (status !== 'all') query.status = status;
    if (priority !== 'all') query.priority = priority;
    if (term) query.title = { $regex: term, $options: 'i' };
    const page = await base44.entities.Ticket.filter(query, { sort: '-created_date', limit: 100 });
    setItems(page?.items || []);
    setLoading(false);
  }, [tenant, status, priority, term]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tenant) return;
    Promise.all([
      base44.entities.Customer.filter({ tenant_id: tenant.id }, { sort: 'name', limit: 500 }),
      base44.entities.TenantMember.filter({ tenant_id: tenant.id, app_role: 'technician' }, { sort: 'name', limit: 50 }),
    ]).then(([customerPage, techPage]) => {
      setCustomers(customerPage?.items || []);
      setTechnicians(techPage?.items || []);
    });
  }, [tenant]);

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Tiket & gangguan" description="Catat gangguan pelanggan dan tugaskan ke teknisi lapangan.">
        <Button onClick={() => setDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tiket baru
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua prioritas</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="low">Rendah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul tiket…" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <LoadingScreen label="Memuat tiket…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Tidak ada tiket"
          description="Tiket baru akan muncul di sini lengkap dengan teknisi yang ditugaskan."
          action={<Button onClick={() => setDialog(true)}>Tiket baru</Button>}
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiket</TableHead>
                  <TableHead className="hidden sm:table-cell">Pelanggan</TableHead>
                  <TableHead className="hidden lg:table-cell">Teknisi</TableHead>
                  <TableHead className="hidden md:table-cell">Dibuat</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link to={`/tiket/${ticket.id}`} className="font-medium hover:text-primary">
                        {ticket.title}
                      </Link>
                      <p className="code-text text-xs text-muted-foreground">{ticket.ticket_number}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{ticket.customer_name || '—'}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {ticket.assigned_to_name || 'Belum ditugaskan'}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {formatDateTime(ticket.created_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={ticket.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TicketDialog
        open={dialog}
        onOpenChange={setDialog}
        tenant={tenant}
        actor={displayName}
        customers={customers}
        technicians={technicians}
        onSaved={load}
      />
    </>
  );
}