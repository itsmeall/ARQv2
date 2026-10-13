import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Plus, Receipt, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import LoadingScreen from '@/components/LoadingScreen';
import CustomerDialog from '@/components/dialogs/CustomerDialog';
import InvoiceDialog from '@/components/dialogs/InvoiceDialog';
import TicketDialog from '@/components/dialogs/TicketDialog';
import MemberDialog from '@/components/dialogs/MemberDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatIDR, formatPeriod } from '@/lib/format';

export default function CustomerDetail() {
  const { customerId } = useParams();
  const { tenant, displayName } = useSession();
  const [customer, setCustomer] = useState(null);
  const [packages, setPackages] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [loginDialog, setLoginDialog] = useState(false);

  const load = useCallback(async () => {
    if (!tenant || !customerId) return;
    const [record, invoiceList, ticketList, pkgs, techs] = await Promise.all([
      base44.entities.Customer.get(customerId),
      base44.entities.Invoice.filter({ tenant_id: tenant.id, customer_id: customerId }, { sort: '-issue_date', limit: 50 }),
      base44.entities.Ticket.filter({ tenant_id: tenant.id, customer_id: customerId }, { sort: '-created_date', limit: 20 }),
      base44.entities.Package.filter({ tenant_id: tenant.id }, { sort: 'name', limit: 100 }),
      base44.entities.TenantMember.filter({ tenant_id: tenant.id, app_role: 'technician' }, { sort: 'name', limit: 50 }),
    ]);
    setCustomer(record);
    setInvoices(invoiceList?.items || []);
    setTickets(ticketList?.items || []);
    setPackages(pkgs?.items || []);
    setTechnicians(techs?.items || []);
  }, [tenant, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tenant) return <LoadingScreen />;
  if (!customer) return <LoadingScreen label="Memuat data pelanggan…" />;

  const unpaid = invoices
    .filter((invoice) => invoice.status === 'unpaid' || invoice.status === 'overdue')
    .reduce((total, invoice) => total + (invoice.total || 0), 0);

  return (
    <>
      <PageHeader title={customer.name} description={`${customer.package_name || 'Tanpa paket'} • ${customer.customer_code || 'ID belum diisi'}`}>
        <Button variant="ghost" asChild>
          <Link to="/pelanggan">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setLoginDialog(true)}>
          <Mail className="mr-2 h-4 w-4" /> Akun login
        </Button>
        <Button variant="outline" onClick={() => setEditDialog(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Ubah
        </Button>
        <Button onClick={() => setInvoiceDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Buat tagihan
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informasi layanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge value={customer.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Jenis</span>
              <StatusBadge value={customer.service_type} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Iuran bulanan</span>
              <span className="font-semibold">{formatIDR(customer.monthly_fee)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Belum dibayar</span>
              <span className="font-semibold">{formatIDR(unpaid)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Tanggal pasang</span>
              <span>{formatDate(customer.install_date)}</span>
            </div>
            {customer.phone ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {customer.phone}
              </p>
            ) : null}
            {customer.email ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {customer.email}
              </p>
            ) : null}
            {customer.address ? (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {customer.address}
              </p>
            ) : null}
            {customer.notes ? <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs">{customer.notes}</p> : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Tagihan</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setInvoiceDialog(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Tagihan baru
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada tagihan untuk pelanggan ini.</p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="code-text truncate text-sm font-medium">{invoice.invoice_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatPeriod(invoice.period)} • jatuh tempo {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold">{formatIDR(invoice.total)}</span>
                    <StatusBadge value={invoice.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-muted-foreground" /> Tiket gangguan
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTicketDialog(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Tiket baru
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada tiket untuk pelanggan ini.</p>
          ) : (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tiket/${ticket.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ticket.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ticket.ticket_number} • {ticket.assigned_to_name || 'Belum ditugaskan'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge value={ticket.priority} />
                  <StatusBadge value={ticket.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" asChild className="text-muted-foreground">
          <Link to="/invoice">
            <Receipt className="mr-2 h-4 w-4" /> Lihat semua tagihan
          </Link>
        </Button>
      </div>

      <CustomerDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        tenant={tenant}
        actor={displayName}
        customer={customer}
        packages={packages}
        onSaved={load}
      />

      <InvoiceDialog
        open={invoiceDialog}
        onOpenChange={setInvoiceDialog}
        tenant={tenant}
        actor={displayName}
        customers={[customer]}
        customer={customer}
        onSaved={load}
      />

      <TicketDialog
        open={ticketDialog}
        onOpenChange={setTicketDialog}
        tenant={tenant}
        actor={displayName}
        customers={[customer]}
        technicians={technicians}
        customer={customer}
        onSaved={load}
      />

      <MemberDialog
        open={loginDialog}
        onOpenChange={setLoginDialog}
        tenant={tenant}
        defaultRole="customer"
        customer={customer}
        customers={[customer]}
        onSaved={load}
      />
    </>
  );
}