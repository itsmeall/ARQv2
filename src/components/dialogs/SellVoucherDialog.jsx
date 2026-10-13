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
import Field from '@/components/Field';
import { sellVouchers } from '@/lib/vouchers';
import { formatIDR } from '@/lib/format';

export default function SellVoucherDialog({ open, onOpenChange, tenant, actor, voucher, onSaved }) {
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && voucher) {
      setError('');
      setPrice(String(voucher.price ?? ''));
    }
  }, [open, voucher]);

  const submit = async (event) => {
    event.preventDefault();
    if (!voucher) return;
    setBusy(true);
    setError('');
    try {
      await sellVouchers({ tenant, vouchers: [voucher], unitPrice: Number(price) || 0, actor });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat penjualan voucher</DialogTitle>
          <DialogDescription>{voucher?.package_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Kode voucher</p>
            <p className="code-text mt-1 text-lg font-semibold">{voucher?.code}</p>
          </div>
          <Field label="Harga jual (Rp)">
            <Input type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">
            Nilai tercatat: <span className="font-semibold text-foreground">{formatIDR(Number(price) || 0)}</span> dan otomatis masuk ke keuangan.
          </p>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Tandai terjual'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}