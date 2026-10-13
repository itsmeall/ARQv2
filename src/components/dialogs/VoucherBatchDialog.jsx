import { useEffect, useState } from 'react';
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
import { generateVoucherBatch } from '@/lib/vouchers';
import { formatIDR } from '@/lib/format';

const EMPTY = { package_id: '', quantity: '20', prefix: '', code_length: '8', name: '', expiry_hours: '' };

export default function VoucherBatchDialog({ open, onOpenChange, tenant, actor, packages, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm({ ...EMPTY, expiry_hours: String(tenant?.default_voucher_expiry_hours || 24) });
    }
  }, [open, tenant]);

  const pkg = packages.find((item) => item.id === form.package_id);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!pkg) {
      setError('Pilih paket terlebih dahulu.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!quantity || quantity < 1 || quantity > 500) {
      setError('Jumlah voucher harus antara 1 dan 500 per batch.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await generateVoucherBatch({
        tenant,
        pkg,
        quantity,
        prefix: form.prefix,
        codeLength: Number(form.code_length) || 8,
        expiryHours: Number(form.expiry_hours) || 24,
        name: form.name,
        actor,
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
          <DialogTitle>Generate batch voucher</DialogTitle>
          <DialogDescription>
            Kode voucher dibuat otomatis dan langsung masuk stok. Maksimal 500 kode per batch.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Paket">
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Jumlah">
              <Input type="number" min="1" max="500" value={form.quantity} onChange={set('quantity')} />
            </Field>
            <Field label="Awalan kode" hint="Opsional">
              <Input value={form.prefix} onChange={set('prefix')} placeholder="ARQ" className="font-mono uppercase" />
            </Field>
            <Field label="Panjang kode">
              <Input type="number" min="4" max="14" value={form.code_length} onChange={set('code_length')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Masa berlaku (jam)">
              <Input type="number" value={form.expiry_hours} onChange={set('expiry_hours')} />
            </Field>
            <Field label="Nama batch" hint="Opsional">
              <Input value={form.name} onChange={set('name')} placeholder="Batch promo Ramadan" />
            </Field>
          </div>
          {pkg ? (
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              {form.quantity || 0} voucher × {formatIDR(pkg.price)} = nilai jual{' '}
              <span className="font-semibold text-foreground">{formatIDR((Number(form.quantity) || 0) * (pkg.price || 0))}</span>
            </p>
          ) : null}
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Membuat voucher…' : 'Generate voucher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}