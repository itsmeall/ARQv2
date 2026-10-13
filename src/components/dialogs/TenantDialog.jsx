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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Field from '@/components/Field';
import { logActivity } from '@/lib/activity';

const EMPTY = {
  name: '',
  code: '',
  owner_name: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  plan: 'business',
  status: 'active',
  default_commission_rate: '10',
  commission_enabled: true,
  hotspot_portal_url: '',
  hotspot_dns_name: '',
  default_voucher_expiry_hours: '24',
  notes: '',
};

export default function TenantDialog({ open, onOpenChange, tenant, actor, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(tenant ? { ...EMPTY, ...tenant } : EMPTY);
    }
  }, [open, tenant]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.code) {
      setError('Nama dan kode perusahaan wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        code: String(form.code).toLowerCase().replace(/[^a-z0-9-]/g, ''),
        owner_name: form.owner_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        address: form.address,
        currency: 'IDR',
        plan: form.plan,
        status: form.status,
        commission_enabled: !!form.commission_enabled,
        default_commission_rate: Number(form.default_commission_rate) || 0,
        hotspot_portal_url: form.hotspot_portal_url,
        hotspot_dns_name: form.hotspot_dns_name,
        default_voucher_expiry_hours: Number(form.default_voucher_expiry_hours) || 24,
        notes: form.notes,
      };
      const saved = tenant
        ? await base44.entities.Tenant.update(tenant.id, payload)
        : await base44.entities.Tenant.create(payload);

      await logActivity({
        tenantId: saved.id,
        actor,
        action: tenant ? 'tenant_updated' : 'tenant_created',
        entity: 'Tenant',
        entityId: saved.id,
        description: `${tenant ? 'Memperbarui' : 'Menambah'} perusahaan ${form.name}`,
      });
      onOpenChange(false);
      onSaved(saved);
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
          <DialogTitle>{tenant ? 'Ubah perusahaan' : 'Perusahaan baru'}</DialogTitle>
          <DialogDescription>
            Setiap perusahaan memiliki data voucher, pelanggan, dan keuangan yang terpisah.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama perusahaan">
              <Input value={form.name} onChange={set('name')} placeholder="ARKAQILA.NET" />
            </Field>
            <Field label="Kode perusahaan" hint="Huruf kecil, tanpa spasi.">
              <Input value={form.code} onChange={set('code')} placeholder="arka" className="font-mono" />
            </Field>
            <Field label="Nama pemilik / penanggung jawab">
              <Input value={form.owner_name ?? ''} onChange={set('owner_name')} />
            </Field>
            <Field label="Nomor telepon">
              <Input value={form.contact_phone ?? ''} onChange={set('contact_phone')} />
            </Field>
            <Field label="Email kontak">
              <Input type="email" value={form.contact_email ?? ''} onChange={set('contact_email')} />
            </Field>
            <Field label="Paket langganan">
              <Select value={form.plan} onValueChange={(value) => setForm((prev) => ({ ...prev, plan: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Alamat">
            <Textarea value={form.address ?? ''} onChange={set('address')} rows={2} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="trial">Uji coba</SelectItem>
                  <SelectItem value="suspended">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Komisi reseller (%)">
              <Input type="number" value={form.default_commission_rate ?? ''} onChange={set('default_commission_rate')} />
            </Field>
            <Field label="Masa berlaku voucher (jam)">
              <Input type="number" value={form.default_voucher_expiry_hours ?? ''} onChange={set('default_voucher_expiry_hours')} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Komisi reseller</p>
              <p className="text-xs text-muted-foreground">Hitung komisi otomatis setiap penjualan voucher reseller.</p>
            </div>
            <Switch
              checked={!!form.commission_enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, commission_enabled: checked }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Portal hotspot (URL)">
              <Input value={form.hotspot_portal_url ?? ''} onChange={set('hotspot_portal_url')} placeholder="http://wifi.arka.net" />
            </Field>
            <Field label="Domain hotspot">
              <Input value={form.hotspot_dns_name ?? ''} onChange={set('hotspot_dns_name')} placeholder="wifi.arka.net" className="font-mono" />
            </Field>
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan perusahaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}