import { base44 } from '@/api/base44Client';
import { logActivity } from '@/lib/activity';
import { todayISO } from '@/lib/format';
import { asItem } from '@/lib/db';

const buildNumber = (period, sequence) => `INV/${String(period).replace('-', '')}/${String(sequence).padStart(4, '0')}`;

export async function createInvoice({ tenant, customer, period, amount, discount, dueDate, notes, actor }) {
  const total = Number(amount) - Number(discount || 0);
  const sequence = (await base44.entities.Invoice.count({ tenant_id: tenant.id })) + 1;

  const invoice = await base44.entities.Invoice.create({
    tenant_id: tenant.id,
    customer_id: customer.id,
    customer_name: customer.name,
    invoice_number: buildNumber(period, sequence),
    period,
    amount: Number(amount),
    discount: Number(discount || 0),
    total,
    status: 'unpaid',
    issue_date: todayISO(),
    due_date: dueDate,
    notes: notes || '',
  });

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'invoice_created',
    entity: 'Invoice',
    entityId: invoice.id,
    description: `Tagihan ${invoice.invoice_number} untuk ${customer.name}`,
  });

  return invoice;
}

export async function generateMonthlyInvoices({ tenant, customers, period, dueDate, actor }) {
  const active = customers.filter((customer) => customer.status === 'active');
  if (!active.length) return 0;

  const existing = await base44.entities.Invoice.filter(
    { tenant_id: tenant.id, period, customer_id: { $in: active.map((c) => c.id) } },
    { limit: 500, fields: ['customer_id'] },
  );
  const billed = new Set((existing?.items || []).map((invoice) => invoice.customer_id));
  const targets = active.filter((customer) => !billed.has(customer.id));
  if (!targets.length) return 0;

  const base = await base44.entities.Invoice.count({ tenant_id: tenant.id });

  const rows = targets.map((customer, index) => ({
    tenant_id: tenant.id,
    customer_id: customer.id,
    customer_name: customer.name,
    invoice_number: buildNumber(period, base + index + 1),
    period,
    amount: customer.monthly_fee || 0,
    discount: 0,
    total: customer.monthly_fee || 0,
    status: 'unpaid',
    issue_date: todayISO(),
    due_date: dueDate,
  }));

  await base44.entities.Invoice.bulkCreate(rows);

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'invoice_generated',
    entity: 'Invoice',
    description: `Membuat ${rows.length} tagihan periode ${period}`,
  });

  return rows.length;
}

export async function markInvoicePaid({ tenant, invoice, method, actor }) {
  const paidDate = todayISO();
  await base44.entities.Invoice.update(invoice.id, {
    status: 'paid',
    paid_date: paidDate,
    payment_method: method,
  });

  await base44.entities.Finance.create({
    tenant_id: tenant.id,
    type: 'income',
    category: 'Tagihan Internet',
    amount: invoice.total,
    description: `Pembayaran ${invoice.invoice_number} — ${invoice.customer_name}`,
    reference: invoice.invoice_number,
    date: paidDate,
    actor_name: actor,
  });

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'invoice_paid',
    entity: 'Invoice',
    entityId: invoice.id,
    description: `Tagihan ${invoice.invoice_number} ditandai lunas`,
  });
}

export async function findCustomerOrNull(customerId) {
  if (!customerId) return null;
  return asItem(await base44.entities.Customer.filter({ id: customerId }, { limit: 1 }));
}