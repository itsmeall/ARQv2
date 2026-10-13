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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Field from '@/components/Field';
import { logActivity } from '@/lib/activity';
import { todayISO } from '@/lib/format';

const EMPTY = { type: 'income', category: '', amount: '', date: '', description: '' };

export default function FinanceDialog({ open, onOpenChange, tenant, actor, entry, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(entry ? { ...EMPTY, ...entry } : { ...EMPTY, date: todayISO() });
    }
  }, [open, entry]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.amount) {
      setError('Nominal wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        tenant_id: tenant.id,
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        date: form.date || todayISO(),
        actor_name: actor,
      };
      if (entry) {
        await base44.entities.Finance.update(entry.id, payload);
      } else {
        await base44.entities.Finance.create(payload);
      }
      await logActivity({
        tenantId: tenant.id,
        actor,
        action: entry ? 'finance_updated' : 'finance_created',
        entity: 'Finance',
        entityId: entry?.id,
        description: `${entry ? 'Memperbarui' : 'Mencatat'} transaksi ${form.category || form.type}`,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? 'Ubah transaksi' : 'Catat transaksi'}</DialogTitle>
          <DialogDescription>Catat pemasukan atau pengeluaran operasional perusahaan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis">
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kategori">
              <Input value={form.category ?? ''} onChange={set('category')} placeholder="Operasional / Bandwidth" />
            </Field>
            <Field label="Nominal (Rp)">
              <Input type="number" value={form.amount} onChange={set('amount')} />
            </Field>
            <Field label="Tanggal">
              <Input type="date" value={form.date ?? ''} onChange={set('date')} />
            </Field>
          </div>
          <Field label="Keterangan">
            <Input value={form.description ?? ''} onChange={set('description')} placeholder="Pembelian perangkat, honor teknisi, dll." />
          </Field>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan transaksi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}