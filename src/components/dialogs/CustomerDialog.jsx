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
import { formatIDR, todayISO } from '@/lib/format';

const EMPTY = {
  name: '',
  customer_code: '',
  email: '',
  phone: '',
  address: '',
  package_id: '',
  service_type: 'pppoe',
  monthly_fee: '',
  status: 'active',
  install_date: '',
  notes: '',
};

export default function CustomerDialog({ open, onOpenChange, tenant, actor, customer, packages, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(customer ? { ...EMPTY, ...customer } : { ...EMPTY, install_date: todayISO() });
    }
  }, [open, customer]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const pickPackage = (packageId) => {
    const pkg = packages.find((item) => item.id === packageId);
    setForm((prev) => ({
      ...prev,
      package_id: packageId,
      service_type: pkg?.service_type || prev.service_type,
      monthly_fee: pkg?.price ?? prev.monthly_fee,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const pkg = packages.find((item) => item.id === form.package_id);
      const payload = {
        tenant_id: tenant.id,
        name: form.name,
        customer_code: form.customer_code,
        email: form.email,
        phone: form.phone,
        address: form.address,
        package_id: form.package_id || null,
        package_name: pkg?.name || '',
        service_type: form.service_type,
        monthly_fee: form.monthly_fee === '' ? 0 : Number(form.monthly_fee),
        status: form.status,
        install_date: form.install_date,
        notes: form.notes,
      };
      if (customer) {
        await base44.entities.Customer.update(customer.id, payload);
      } else {
        await base44.entities.Customer.create(payload);
      }
      await logActivity({
        tenantId: tenant.id,
        actor,
        action: customer ? 'customer_updated' : 'customer_created',
        entity: 'Customer',
        entityId: customer?.id,
        description: `${customer ? 'Memperbarui' : 'Menambah'} pelanggan ${form.name}`,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? 'Ubah data pelanggan' : 'Pelanggan baru'}</DialogTitle>
          <DialogDescription>Data pelanggan dipakai untuk tagihan bulanan dan tiket gangguan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama pelanggan">
              <Input value={form.name} onChange={set('name')} placeholder="Budi Santoso" />
            </Field>
            <Field label="ID pelanggan" hint="Opsional, mis. nomor pelanggan PPPoE.">
              <Input value={form.customer_code ?? ''} onChange={set('customer_code')} placeholder="ARQ-0012" className="font-mono" />
            </Field>
            <Field label="Nomor WhatsApp / telepon">
              <Input value={form.phone ?? ''} onChange={set('phone')} placeholder="08xxxxxxxxxx" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="pelanggan@email.com" />
            </Field>
          </div>
          <Field label="Alamat pemasangan">
            <Textarea value={form.address ?? ''} onChange={set('address')} rows={2} placeholder="Alamat lengkap" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Paket langganan">
              <Select value={form.package_id} onValueChange={pickPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Iuran bulanan (Rp)">
              <Input type="number" value={form.monthly_fee ?? ''} onChange={set('monthly_fee')} placeholder="150000" />
            </Field>
            <Field label="Status layanan">
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="suspended">Ditangguhkan</SelectItem>
                  <SelectItem value="isolated">Terisolasi</SelectItem>
                  <SelectItem value="terminated">Berhenti</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal pasang">
              <Input type="date" value={form.install_date ?? ''} onChange={set('install_date')} />
            </Field>
            <Field label="Iuran" hint="Nilai iuran akan dipakai otomatis saat membuat tagihan.">
              <Input value={formatIDR(form.monthly_fee || 0)} readOnly className="bg-muted/50" />
            </Field>
          </div>
          <Field label="Catatan">
            <Textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} />
          </Field>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan pelanggan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}