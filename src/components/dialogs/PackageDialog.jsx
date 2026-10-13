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

const EMPTY = {
  name: '',
  service_type: 'hotspot',
  speed_mbps: '',
  price: '',
  cost: '',
  duration_hours: '',
  quota_label: '',
  description: '',
  status: 'active',
};

const toNum = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

export default function PackageDialog({ open, onOpenChange, tenant, actor, pkg, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(pkg ? { ...EMPTY, ...pkg } : EMPTY);
    }
  }, [open, pkg]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.price) {
      setError('Nama paket dan harga wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        tenant_id: tenant.id,
        name: form.name,
        service_type: form.service_type,
        speed_mbps: toNum(form.speed_mbps),
        price: toNum(form.price) || 0,
        cost: toNum(form.cost) || 0,
        duration_hours: toNum(form.duration_hours),
        quota_label: form.quota_label,
        description: form.description,
        status: form.status,
      };
      if (pkg) {
        await base44.entities.Package.update(pkg.id, payload);
      } else {
        await base44.entities.Package.create(payload);
      }
      await logActivity({
        tenantId: tenant.id,
        actor,
        action: pkg ? 'package_updated' : 'package_created',
        entity: 'Package',
        entityId: pkg?.id,
        description: `${pkg ? 'Memperbarui' : 'Menambah'} paket ${form.name}`,
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
          <DialogTitle>{pkg ? 'Ubah paket' : 'Paket baru'}</DialogTitle>
          <DialogDescription>Paket dipakai untuk membuat voucher hotspot dan tagihan pelanggan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nama paket">
            <Input value={form.name} onChange={set('name')} placeholder="Hotspot 1 Hari" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis layanan">
              <Select value={form.service_type} onValueChange={(value) => setForm((prev) => ({ ...prev, service_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotspot">Voucher Hotspot</SelectItem>
                  <SelectItem value="pppoe">Langganan PPPoE</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kecepatan (Mbps)">
              <Input type="number" value={form.speed_mbps ?? ''} onChange={set('speed_mbps')} placeholder="10" />
            </Field>
            <Field label="Harga jual (Rp)">
              <Input type="number" value={form.price ?? ''} onChange={set('price')} placeholder="5000" />
            </Field>
            <Field label="Harga modal (Rp)">
              <Input type="number" value={form.cost ?? ''} onChange={set('cost')} placeholder="3000" />
            </Field>
            <Field label="Masa aktif (jam)" hint="Dipakai sebagai masa berlaku voucher.">
              <Input type="number" value={form.duration_hours ?? ''} onChange={set('duration_hours')} placeholder="24" />
            </Field>
            <Field label="Kuota / keterangan">
              <Input value={form.quota_label ?? ''} onChange={set('quota_label')} placeholder="Unlimited" />
            </Field>
          </div>
          <Field label="Deskripsi">
            <Textarea value={form.description ?? ''} onChange={set('description')} rows={2} placeholder="Keterangan singkat paket" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan paket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}