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

const ROLE_HINTS = {
  owner_admin: 'Akses penuh termasuk pengaturan perusahaan dan keuangan.',
  admin: 'Mengelola operasional: voucher, reseller, pelanggan, tagihan, tiket.',
  reseller: 'Hanya melihat stok, penjualan, dan komisinya sendiri.',
  technician: 'Hanya melihat tiket yang ditugaskan kepadanya.',
  customer: 'Hanya melihat tagihan miliknya sendiri.',
};

export default function MemberDialog({ open, onOpenChange, tenant, member, customer, customers = [], defaultRole = 'reseller', onSaved }) {
  const [form, setForm] = useState({ app_role: defaultRole, name: '', email: '', phone: '', customer_id: '', commission_rate: '', status: 'invited' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setNotice('');
      setForm(
        member
          ? {
              app_role: member.app_role || defaultRole,
              name: member.name || '',
              email: member.email || '',
              phone: member.phone || '',
              customer_id: member.customer_id || customer?.id || '',
              commission_rate: member.commission_rate ?? '',
              status: member.status || 'active',
            }
          : { app_role: defaultRole, name: '', email: '', phone: '', customer_id: customer?.id || '', commission_rate: '', status: 'invited' },
      );
    }
  }, [open, member, defaultRole, customer]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.name) {
      setError('Nama dan email wajib diisi.');
      return;
    }
    if (form.app_role === 'customer' && !form.customer_id) {
      setError('Pilih data pelanggan yang akan ditautkan.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await base44.functions.invoke('manageMember', {
        action: member ? 'update' : 'invite',
        tenant_id: tenant.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        app_role: form.app_role,
        customer_id: form.app_role === 'customer' ? form.customer_id : null,
        commission_rate: form.app_role === 'reseller' ? form.commission_rate : null,
        status: form.status,
      });
      const data = response?.data || {};
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.invite_error) {
        setNotice(`Anggota tersimpan, tetapi email undangan gagal dikirim (${data.invite_error}).`);
      }
      onSaved(data.member);
      if (!data.invite_error) onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan anggota.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{member ? 'Ubah akses anggota' : 'Tambah anggota & undang login'}</DialogTitle>
          <DialogDescription>
            Anggota akan menerima email undangan dan hanya melihat menu sesuai perannya.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Peran">
            <Select value={form.app_role} onValueChange={(value) => setForm((prev) => ({ ...prev, app_role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner_admin">Pemilik</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="reseller">Reseller</SelectItem>
                <SelectItem value="technician">Teknisi</SelectItem>
                <SelectItem value="customer">Pelanggan</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">{ROLE_HINTS[form.app_role]}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama">
              <Input value={form.name} onChange={set('name')} placeholder="Nama lengkap" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set('email')} placeholder="nama@email.com" disabled={!!member} />
            </Field>
            <Field label="Nomor telepon">
              <Input value={form.phone} onChange={set('phone')} placeholder="08xxxxxxxxxx" />
            </Field>
            {form.app_role === 'reseller' ? (
              <Field label="Komisi (%)" hint={`Kosongkan untuk memakai pengaturan perusahaan (${tenant?.default_commission_rate ?? 0}%).`}>
                <Input type="number" value={form.commission_rate} onChange={set('commission_rate')} placeholder="10" />
              </Field>
            ) : null}
            {form.app_role === 'customer' ? (
              <Field label="Tautkan ke pelanggan" className="sm:col-span-2">
                <Select value={form.customer_id} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {member ? (
              <Field label="Status akses">
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="invited">Diundang</SelectItem>
                    <SelectItem value="suspended">Ditangguhkan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm font-medium text-amber-600">{notice}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : member ? 'Simpan perubahan' : 'Undang anggota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}