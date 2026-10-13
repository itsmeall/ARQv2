import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingScreen from '@/components/LoadingScreen';
import CustomerDialog from '@/components/dialogs/CustomerDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatIDR } from '@/lib/format';

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'suspended', label: 'Ditangguhkan' },
  { value: 'isolated', label: 'Terisolasi' },
  { value: 'terminated', label: 'Berhenti' },
];

export default function Customers() {
  const { tenant, displayName } = useSession();
  const [items, setItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, customer: null });

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const query = { tenant_id: tenant.id };
    if (status !== 'all') query.status = status;
    if (term) query.name = { $regex: term, $options: 'i' };
    const page = await base44.entities.Customer.filter(query, { sort: 'name', limit: 100 });
    setItems(page?.items || []);
    setLoading(false);
  }, [tenant, status, term]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tenant) return;
    base44.entities.Package.filter({ tenant_id: tenant.id }, { sort: 'name', limit: 100 }).then((page) =>
      setPackages(page?.items || []),
    );
  }, [tenant]);

  if (!tenant) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Pelanggan" description="Data pelanggan internet, paket langganan, dan status layanan.">
        <Button onClick={() => setDialog({ open: true, customer: null })}>
          <Plus className="mr-2 h-4 w-4" /> Pelanggan baru
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama pelanggan…" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <LoadingScreen label="Memuat pelanggan…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada pelanggan"
          description="Tambahkan pelanggan pertama untuk mulai membuat tagihan bulanan."
          action={
            <Button onClick={() => setDialog({ open: true, customer: null })}>
              <Plus className="mr-2 h-4 w-4" /> Pelanggan baru
            </Button>
          }
        />
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="hidden sm:table-cell">Paket</TableHead>
                  <TableHead className="hidden md:table-cell">Kontak</TableHead>
                  <TableHead className="text-right">Iuran</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link to={`/pelanggan/${customer.id}`} className="font-medium hover:text-primary">
                        {customer.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{customer.customer_code || customer.service_type}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {customer.package_name || '—'}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {customer.phone || customer.email || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(customer.monthly_fee)}</TableCell>
                    <TableCell>
                      <StatusBadge value={customer.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CustomerDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, customer: open ? dialog.customer : null })}
        tenant={tenant}
        actor={displayName}
        customer={dialog.customer}
        packages={packages}
        onSaved={load}
      />
    </>
  );
}