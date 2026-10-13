import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Trash2, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmDialog from '@/components/ConfirmDialog';
import Field from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format';
import { logActivity } from '@/lib/activity';

export default function TicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { tenant, displayName } = useSession();
  const [ticket, setTicket] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [form, setForm] = useState({ status: 'open', assigned_to: 'none', resolution_note: '' });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tenant || !ticketId) return;
    const [record, techs] = await Promise.all([
      base44.entities.Ticket.get(ticketId),
      base44.entities.TenantMember.filter({ tenant_id: tenant.id, app_role: 'technician' }, { sort: 'name', limit: 50 }),
    ]);
    setTicket(record);
    setTechnicians(techs?.items || []);
    setForm({
      status: record?.status || 'open',
      assigned_to: record?.assigned_to || 'none',
      resolution_note: record?.resolution_note || '',
    });
  }, [tenant, ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const technician = technicians.find((item) => item.id === form.assigned_to);
      const closing = ['resolved', 'closed'].includes(form.status);
      await base44.entities.Ticket.update(ticket.id, {
        status: form.status,
        assigned_to: technician?.id || null,
        assigned_to_name: technician?.name || '',
        resolution_note: form.resolution_note,
        resolved_date: closing ? ticket.resolved_date || new Date().toISOString() : null,
      });
      await logActivity({
        tenantId: tenant.id,
        actor: displayName,
        action: 'ticket_updated',
        entity: 'Ticket',
        entityId: ticket.id,
        description: `Tiket ${ticket.ticket_number} diperbarui (${form.status})`,
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await base44.entities.Ticket.delete(ticket.id);
    await logActivity({
      tenantId: tenant.id,
      actor: displayName,
      action: 'ticket_deleted',
      entity: 'Ticket',
      entityId: ticket.id,
      description: `Menghapus tiket ${ticket.ticket_number}`,
    });
    navigate('/tiket');
  };

  if (!tenant) return <LoadingScreen />;
  if (!ticket) return <LoadingScreen label="Memuat tiket…" />;

  return (
    <>
      <PageHeader title={ticket.title} description={`${ticket.ticket_number} • dibuat ${formatDateTime(ticket.created_date)}`}>
        <Button variant="ghost" asChild>
          <Link to="/tiket">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <Button variant="outline" className="text-destructive" onClick={() => setConfirm(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Hapus
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detail gangguan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={ticket.status} />
              <StatusBadge value={ticket.priority} />
              <StatusBadge value={ticket.category} />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {ticket.description || 'Tidak ada detail tambahan.'}
            </p>
            <div className="grid gap-3 border-t border-border/70 pt-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Pelanggan</p>
                {ticket.customer_id ? (
                  <Link to={`/pelanggan/${ticket.customer_id}`} className="mt-1 flex items-center gap-2 hover:text-primary">
                    <User className="h-4 w-4" /> {ticket.customer_name || 'Pelanggan'}
                  </Link>
                ) : (
                  <p className="mt-1 text-muted-foreground">Tanpa pelanggan</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Dibuat oleh</p>
                <p className="mt-1">{ticket.created_by_name || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Penanganan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Baru</SelectItem>
                  <SelectItem value="in_progress">Dikerjakan</SelectItem>
                  <SelectItem value="waiting">Menunggu</SelectItem>
                  <SelectItem value="resolved">Selesai</SelectItem>
                  <SelectItem value="closed">Ditutup</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Teknisi">
              <Select value={form.assigned_to} onValueChange={(value) => setForm((prev) => ({ ...prev, assigned_to: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Belum ditugaskan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum ditugaskan</SelectItem>
                  {technicians.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name || item.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Catatan penyelesaian">
              <Textarea
                rows={4}
                value={form.resolution_note}
                onChange={(event) => setForm((prev) => ({ ...prev, resolution_note: event.target.value }))}
                placeholder="Hasil pengecekan, tindakan, dan kondisi akhir"
              />
            </Field>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
            <Button className="w-full" onClick={save} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan penanganan'}
            </Button>
            {ticket.customer_name ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Hubungi {ticket.customer_name} untuk konfirmasi
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Hapus tiket ${ticket.ticket_number}?`}
        description="Riwayat penanganan tiket ini akan hilang."
        onConfirm={remove}
      />
    </>
  );
}