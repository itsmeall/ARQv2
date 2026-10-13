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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Field from '@/components/Field';
import { createInvoice } from '@/lib/billing';
import { addDaysISO, formatIDR, monthPeriod } from '@/lib/format';

export default function InvoiceDialog({ open, onOpenChange, tenant, actor, customers, customer, onSaved }) {
  const [form, setForm] = useState({ customer_id: '', period: '', amount: '', discount: '0', due_date: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm({
        customer_id: customer?.id || '',
        period: monthPeriod(),
        amount: String(customer?.monthly_fee ?? ''),
        discount: '0',
        due_date: addDaysISO(7).slice(0, 10),
        notes: '',
      });
    }
  }, [open, customer]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const pickCustomer = (customerId) => {
    const found = customers.find((item) => item.id === customerId);
    setForm((prev) => ({ ...prev, customer_id: customerId, amount: String(found?.monthly_fee ?? prev.amount) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const target = customers.find((item) => item.id === form.customer_id);
    if (!target) {
      setError('Pilih pelanggan terlebih dahulu.');
      return;
    }
    if (!form.amount) {
      setError('Nominal tagihan wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createInvoice({
        tenant,
        customer: target,
        period: form.period || monthPeriod(),
        amount: Number(form.amount),
        discount: Number(form.discount) || 0,
        dueDate: form.due_date,
        notes: form.notes,
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

  const total = (Number(form.amount) || 0) - (Number(form.discount) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Buat tagihan</DialogTitle>
          <DialogDescription>Tagihan dibuat per pelanggan untuk satu periode bulanan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Pelanggan">
            <Select value={form.customer_id} onValueChange={pickCustomer} disabled={!!customer}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih pelanggan" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Periode">
              <Input type="month" value={form.period} onChange={set('period')} />
            </Field>
            <Field label="Jatuh tempo">
              <Input type="date" value={form.due_date} onChange={set('due_date')} />
            </Field>
            <Field label="Nominal (Rp)">
              <Input type="number" value={form.amount} onChange={set('amount')} />
            </Field>
            <Field label="Diskon (Rp)">
              <Input type="number" value={form.discount} onChange={set('discount')} />
            </Field>
          </div>
          <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            Total tagihan <span className="font-semibold text-foreground">{formatIDR(total)}</span>
          </p>
          <Field label="Catatan">
            <Textarea value={form.notes} onChange={set('notes')} rows={2} />
          </Field>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Buat tagihan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}