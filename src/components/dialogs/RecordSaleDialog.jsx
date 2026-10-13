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
import Field from '@/components/Field';
import { sellVouchers } from '@/lib/vouchers';
import { formatIDR } from '@/lib/format';

export default function RecordSaleDialog({ open, onOpenChange, tenant, reseller, stock, actor, onSaved }) {
  const [form, setForm] = useState({ quantity: '1', unit_price: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && stock) {
      setError('');
      setForm({ quantity: '1', unit_price: String(stock.price ?? '') });
    }
  }, [open, stock]);

  const rate = stock?.commission_rate ?? reseller?.commission_rate ?? tenant?.default_commission_rate ?? 0;
  const quantity = Number(form.quantity) || 0;
  const unitPrice = Number(form.unit_price) || 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!stock) return;
    if (quantity < 1 || quantity > (stock.quantity_remaining || 0)) {
      setError(`Jumlah harus antara 1 dan ${stock.quantity_remaining || 0}.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const page = await base44.entities.Voucher.filter(
        { tenant_id: tenant.id, reseller_id: reseller.id, package_id: stock.package_id, status: 'allocated' },
        { limit: quantity, sort: 'created_date' },
      );
      const vouchers = page?.items || [];
      if (vouchers.length < quantity) {
        setError(`Voucher siap jual hanya ${vouchers.length}.`);
        return;
      }
      await sellVouchers({ tenant, vouchers, unitPrice, reseller, commissionRate: rate, actor, stock });
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
          <DialogTitle>Catat penjualan voucher</DialogTitle>
          <DialogDescription>
            {stock?.package_name} • sisa stok {stock?.quantity_remaining || 0} voucher
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jumlah terjual">
              <Input type="number" min="1" max={stock?.quantity_remaining || 1} value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} />
            </Field>
            <Field label="Harga jual per voucher">
              <Input type="number" value={form.unit_price} onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))} />
            </Field>
          </div>
          <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            Total penjualan <span className="font-semibold text-foreground">{formatIDR(quantity * unitPrice)}</span> • komisi{' '}
            <span className="font-semibold text-foreground">{formatIDR(Math.round((unitPrice * rate) / 100) * quantity)}</span> ({rate}%)
          </p>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Catat penjualan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}