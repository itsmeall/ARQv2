import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Field from '@/components/Field';
import { logActivity } from '@/lib/activity';

const EMPTY = { customer_id: 'none', title: '', description: '', category: 'gangguan', priority: 'medium', assigned_to: 'none' };

export default function TicketDialog({ open, onOpenChange, tenant, actor, customers = [], technicians = [], customer, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm({ ...EMPTY, customer_id: customer?.id || 'none' });
    }
  }, [open, customer]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title) {
      setError('Judul tiket wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const target = customers.find((item) => item.id === form.customer_id);
      const technician = technicians.find((item) => item.id === form.assigned_to);
      const sequence = (await base44.entities.Ticket.count({ tenant_id: tenant.id })) + 1;

      await base44.entities.Ticket.create({
        tenant_id: tenant.id,
        customer_id: target?.id || null,
        customer_name: target?.name || '',
        ticket_number: `TKT/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${String(sequence).padStart(3, '0')}`,
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        status: 'open',
        assigned_to: technician?.id || null,
        assigned_to_name: technician?.name || '',
        created_by_name: actor,
      });

      await logActivity({
        tenantId: tenant.id,
        actor,
        action: 'ticket_created',
        entity: 'Ticket',
        description: `Tiket baru: ${form.title}${target ? ` (${target.name})` : ''}`,
      });

      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tiket baru</DialogTitle>
          <DialogDescription>Catat gangguan atau permintaan pelanggan, lalu tugaskan ke teknisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Pelanggan">
            <Select value={form.customer_id} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih pelanggan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa pelanggan</SelectItem>
                {customers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Judul gangguan">
            <Input value={form.title} onChange={set('title')} placeholder="Internet mati sejak pagi" />
          </Field>
          <Field label="Detail">
            <Textarea value={form.description} onChange={set('description')} rows={3} placeholder="Kronologi singkat, lokasi, dan hasil pengecekan awal" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kategori">
              <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gangguan">Gangguan</SelectItem>
                  <SelectItem value="instalasi">Instalasi</SelectItem>
                  <SelectItem value="perangkat">Perangkat</SelectItem>
                  <SelectItem value="tagihan">Tagihan</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prioritas">
              <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rendah</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="high">Tinggi</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
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
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan tiket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}