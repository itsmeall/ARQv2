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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Field from '@/components/Field';
import { markInvoicePaid } from '@/lib/billing';
import { formatIDR, formatPeriod } from '@/lib/format';

export default function PayInvoiceDialog({ open, onOpenChange, tenant, actor, invoice, onSaved }) {
  const [method, setMethod] = useState('transfer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setMethod('transfer');
    }
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (!invoice) return;
    setBusy(true);
    setError('');
    try {
      await markInvoicePaid({ tenant, invoice, method, actor });
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
          <DialogTitle>Tandai tagihan lunas</DialogTitle>
          <DialogDescription>
            {invoice?.invoice_number} • {invoice?.customer_name} • {formatPeriod(invoice?.period)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Total tagihan</p>
            <p className="mt-1 font-heading text-xl font-bold">{formatIDR(invoice?.total)}</p>
          </div>
          <Field label="Metode pembayaran">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer bank</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground">Pembayaran otomatis dicatat sebagai pemasukan di menu Keuangan.</p>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Tandai lunas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}