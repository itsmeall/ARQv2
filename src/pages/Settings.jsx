import { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import Field from '@/components/Field';
import LoadingScreen from '@/components/LoadingScreen';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logActivity } from '@/lib/activity';

export default function Settings() {
  const { tenant, displayName, reload } = useSession();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant && !form) setForm({ ...tenant });
  }, [tenant, form]);

  if (!tenant || !form) return <LoadingScreen />;

  const set = (key) => (event) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await base44.entities.Tenant.update(tenant.id, {
        name: form.name,
        owner_name: form.owner_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        address: form.address,
        plan: form.plan,
        status: form.status,
        commission_enabled: !!form.commission_enabled,
        default_commission_rate: Number(form.default_commission_rate) || 0,
        hotspot_portal_url: form.hotspot_portal_url,
        hotspot_dns_name: form.hotspot_dns_name,
        default_voucher_expiry_hours: Number(form.default_voucher_expiry_hours) || 24,
        notes: form.notes,
      });
      await logActivity({
        tenantId: tenant.id,
        actor: displayName,
        action: 'settings_updated',
        entity: 'Tenant',
        entityId: tenant.id,
        description: 'Memperbarui pengaturan perusahaan',
      });
      setSaved(true);
      if (reload) reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Pengaturan" description="Identitas perusahaan, komisi reseller, dan portal hotspot.">
        <StatusBadge value={tenant.status} />
      </PageHeader>

      <form onSubmit={save} className="space-y-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="h-4 w-4 text-muted-foreground" /> Identitas perusahaan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama perusahaan">
              <Input value={form.name || ''} onChange={set('name')} />
            </Field>
            <Field label="Kode perusahaan" hint="Huruf kecil, dipakai untuk penamaan file ekspor.">
              <Input value={form.code || ''} readOnly className="bg-muted/50 font-mono" />
            </Field>
            <Field label="Nama pemilik / penanggung jawab">
              <Input value={form.owner_name || ''} onChange={set('owner_name')} />
            </Field>
            <Field label="Nomor telepon">
              <Input value={form.contact_phone || ''} onChange={set('contact_phone')} />
            </Field>
            <Field label="Email kontak">
              <Input type="email" value={form.contact_email || ''} onChange={set('contact_email')} />
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
            <Field label="Alamat" className="sm:col-span-2">
              <Textarea value={form.address || ''} onChange={set('address')} rows={2} />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Komisi & voucher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Komisi reseller aktif</p>
                <p className="text-xs text-muted-foreground">Komisi dihitung otomatis pada setiap penjualan voucher reseller.</p>
              </div>
              <Switch
                checked={!!form.commission_enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, commission_enabled: checked }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Komisi default (%)">
                <Input type="number" value={form.default_commission_rate ?? ''} onChange={set('default_commission_rate')} />
              </Field>
              <Field label="Masa berlaku voucher default (jam)">
                <Input type="number" value={form.default_voucher_expiry_hours ?? ''} onChange={set('default_voucher_expiry_hours')} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Portal hotspot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="URL portal">
              <Input value={form.hotspot_portal_url || ''} onChange={set('hotspot_portal_url')} placeholder="http://wifi.arka.net" />
            </Field>
            <Field label="Domain hotspot">
              <Input value={form.hotspot_dns_name || ''} onChange={set('hotspot_dns_name')} className="font-mono" />
            </Field>
            <Field label="Catatan internal" className="sm:col-span-2">
              <Textarea value={form.notes || ''} onChange={set('notes')} rows={2} />
            </Field>
          </CardContent>
        </Card>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        <div className="flex items-center justify-end gap-3">
          {saved ? <span className="text-sm text-emerald-600">Perubahan tersimpan.</span> : null}
          <Button type="submit" disabled={busy}>
            <Save className="mr-2 h-4 w-4" /> {busy ? 'Menyimpan…' : 'Simpan pengaturan'}
          </Button>
        </div>
      </form>
    </>
  );
}