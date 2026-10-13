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
import { allocateStock } from '@/lib/vouchers';
import { formatIDR } from '@/lib/format';

export default function AllocateStockDialog({ open, onOpenChange, tenant, reseller, packages, actor, onSaved }) {
  const [form, setForm] = useState({ package_id: '', quantity: '10', note: '' });
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setAvailable(null);
      setForm({ package_id: '', quantity: '10', note: '' });
    }
  }, [open]);

  useEffect(() => {
    let active = true;
    if (!open || !form.package_id) {
      setAvailable(null);
      return () => {
        active = false;
      };
    }
    base44.entities.Voucher.count({ tenant_id: tenant.id, package_id: form.package_id, status: 'available' })
      .then((total) => {
        if (active) setAvailable(total);
      })
      .catch(() => {
        if (active) setAvailable(null);
      });
    return () => {
      active = false;
    };
  }, [open, form.package_id, tenant.id]);

  const pkg = packages.find((item) => item.id === form.package_id);
  const rate = reseller?.commission_rate ?? tenant?.default_commission_rate ?? 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!pkg) {
      setError('Pilih paket yang akan dialokasikan.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!quantity || quantity < 1) {
      setError('Jumlah voucher tidak valid.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await allocateStock({ tenant, reseller, pkg, quantity, actor, note: form.note });
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
          <DialogTitle>Alokasi stok voucher</DialogTitle>
          <DialogDescription>
            Voucher akan dipindahkan dari stok perusahaan ke {reseller?.name || reseller?.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Paket" hint={available === null ? undefined : `Stok perusahaan tersedia: ${available} voucher.`}>
            <Select value={form.package_id} onValueChange={(value) => setForm((prev) => ({ ...prev, package_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih paket" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} — {formatIDR(item.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jumlah voucher">
              <Input type="number" min="1" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
            </Field>
            <Field label="Komisi reseller" hint="Mengikuti pengaturan komisi anggota.">
              <Input value={`${rate}%`} readOnly className="bg-muted/50" />
            </Field>
          </div>
          <Field label="Catatan">
            <Input value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Opsional" />
          </Field>
          {pkg ? (
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              Nilai stok dialokasikan <span className="font-semibold text-foreground">{formatIDR((Number(form.quantity) || 0) * (pkg.price || 0))}</span>
            </p>
          ) : null}
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Mengalokasikan…' : 'Alokasikan stok'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}