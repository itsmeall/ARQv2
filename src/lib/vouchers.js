import { base44 } from '@/api/base44Client';
import { logActivity } from '@/lib/activity';
import { addHoursISO, todayISO } from '@/lib/format';
import { asItem } from '@/lib/db';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeCode(prefix = '', length = 8) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let body = '';
  for (let i = 0; i < length; i += 1) body += CHARS[bytes[i] % CHARS.length];
  return `${prefix}${body}`.toUpperCase();
}

export function makeCodes(prefix, length, quantity) {
  const set = new Set();
  let guard = 0;
  while (set.size < quantity && guard < quantity * 40) {
    set.add(makeCode(prefix, length));
    guard += 1;
  }
  return [...set];
}

export async function generateVoucherBatch({ tenant, pkg, quantity, prefix, codeLength, expiryHours, name, actor }) {
  const cleanPrefix = (prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const codes = makeCodes(cleanPrefix, Number(codeLength) || 8, Number(quantity));
  const expiryDate = addHoursISO(expiryHours);

  const batch = await base44.entities.VoucherBatch.create({
    tenant_id: tenant.id,
    package_id: pkg.id,
    package_name: pkg.name,
    name: name || `${pkg.name} • ${quantity} voucher`,
    quantity: codes.length,
    prefix: cleanPrefix,
    code_length: Number(codeLength) || 8,
    price: pkg.price,
    cost: pkg.cost || 0,
    expiry_hours: expiryHours,
    created_by_name: actor,
    status: 'active',
  });

  const rows = codes.map((code) => ({
    tenant_id: tenant.id,
    batch_id: batch.id,
    package_id: pkg.id,
    package_name: pkg.name,
    code,
    price: pkg.price,
    cost: pkg.cost || 0,
    status: 'available',
    expiry_date: expiryDate,
  }));

  for (let i = 0; i < rows.length; i += 400) {
    await base44.entities.Voucher.bulkCreate(rows.slice(i, i + 400));
  }

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'voucher_batch_created',
    entity: 'VoucherBatch',
    entityId: batch.id,
    description: `Membuat ${rows.length} voucher ${pkg.name}`,
  });

  return { batch, count: rows.length };
}

export async function allocateStock({ tenant, reseller, pkg, quantity, actor, note }) {
  const qty = Number(quantity);
  const available = await base44.entities.Voucher.filter(
    { tenant_id: tenant.id, package_id: pkg.id, status: 'available' },
    { limit: Math.min(qty, 500), sort: 'created_date' },
  );
  const vouchers = available?.items || [];
  if (vouchers.length < qty) {
    throw new Error(`Stok tersedia untuk ${pkg.name} hanya ${vouchers.length} voucher.`);
  }

  await base44.entities.Voucher.bulkUpdate(
    vouchers.map((voucher) => ({
      id: voucher.id,
      status: 'allocated',
      reseller_id: reseller.id,
      reseller_name: reseller.name || reseller.email,
    })),
  );

  const rate = reseller.commission_rate ?? tenant.default_commission_rate ?? 0;
  const existing = asItem(
    await base44.entities.ResellerStock.filter(
      { tenant_id: tenant.id, reseller_id: reseller.id, package_id: pkg.id },
      { limit: 1 },
    ),
  );

  if (existing) {
    await base44.entities.ResellerStock.update(existing.id, {
      quantity_in: (existing.quantity_in || 0) + qty,
      quantity_remaining: (existing.quantity_remaining || 0) + qty,
      price: pkg.price,
      commission_rate: rate,
      last_mutation_date: new Date().toISOString(),
    });
  } else {
    await base44.entities.ResellerStock.create({
      tenant_id: tenant.id,
      reseller_id: reseller.id,
      reseller_name: reseller.name || reseller.email,
      package_id: pkg.id,
      package_name: pkg.name,
      quantity_in: qty,
      quantity_sold: 0,
      quantity_returned: 0,
      quantity_remaining: qty,
      price: pkg.price,
      commission_rate: rate,
      last_mutation_date: new Date().toISOString(),
    });
  }

  await base44.entities.StockMutation.create({
    tenant_id: tenant.id,
    reseller_id: reseller.id,
    reseller_name: reseller.name || reseller.email,
    package_id: pkg.id,
    package_name: pkg.name,
    type: 'allocation',
    quantity: qty,
    unit_price: pkg.price,
    amount: qty * (pkg.price || 0),
    actor_name: actor,
    note: note || 'Alokasi stok voucher',
  });

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'stock_allocated',
    entity: 'ResellerStock',
    description: `Alokasi ${qty} voucher ${pkg.name} ke ${reseller.name || reseller.email}`,
  });

  return qty;
}

export async function sellVouchers({ tenant, vouchers, unitPrice, reseller, commissionRate, actor, stock, note }) {
  const list = vouchers.filter(Boolean);
  if (!list.length) throw new Error('Tidak ada voucher yang bisa dijual.');

  const price = Number(unitPrice);
  const rate = Number(commissionRate) || 0;
  const commission = Math.round((price * rate) / 100);
  const soldDate = todayISO();

  await base44.entities.Voucher.bulkUpdate(
    list.map((voucher) => ({
      id: voucher.id,
      status: 'sold',
      sold_price: price,
      commission_amount: reseller ? commission : 0,
      sold_date: soldDate,
    })),
  );

  if (reseller && stock) {
    await base44.entities.ResellerStock.update(stock.id, {
      quantity_sold: (stock.quantity_sold || 0) + list.length,
      quantity_remaining: Math.max((stock.quantity_remaining || 0) - list.length, 0),
      last_mutation_date: soldDate,
    });

    await base44.entities.StockMutation.create({
      tenant_id: tenant.id,
      reseller_id: reseller.id,
      reseller_name: reseller.name || reseller.email,
      package_id: list[0].package_id,
      package_name: list[0].package_name,
      type: 'sale',
      quantity: list.length,
      unit_price: price,
      amount: price * list.length,
      actor_name: actor,
      note: note || 'Penjualan voucher oleh reseller',
    });
  }

  await base44.entities.Finance.create({
    tenant_id: tenant.id,
    type: 'income',
    category: 'Penjualan Voucher',
    amount: price * list.length,
    description: `${list.length} voucher ${list[0].package_name}${reseller ? ` via ${reseller.name || reseller.email}` : ''}`,
    reference: list[0].code,
    date: todayISO(),
    actor_name: actor,
  });

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'voucher_sold',
    entity: 'Voucher',
    entityId: list[0].id,
    description: `Penjualan ${list.length} voucher ${list[0].package_name}${reseller ? ` oleh ${reseller.name || reseller.email}` : ''}`,
  });

  return list.length;
}

export async function voidVoucher({ tenant, voucher, actor, stock, reseller }) {
  await base44.entities.Voucher.update(voucher.id, { status: 'void' });

  if (stock) {
    await base44.entities.ResellerStock.update(stock.id, {
      quantity_remaining: Math.max((stock.quantity_remaining || 0) - 1, 0),
      quantity_returned: (stock.quantity_returned || 0) + 1,
      last_mutation_date: new Date().toISOString(),
    });
    await base44.entities.StockMutation.create({
      tenant_id: tenant.id,
      reseller_id: reseller?.id || voucher.reseller_id,
      reseller_name: reseller?.name || voucher.reseller_name,
      package_id: voucher.package_id,
      package_name: voucher.package_name,
      type: 'return',
      quantity: 1,
      unit_price: voucher.price,
      amount: voucher.price || 0,
      actor_name: actor,
      note: 'Voucher dikembalikan / hangus',
    });
  }

  await logActivity({
    tenantId: tenant.id,
    actor,
    action: 'voucher_void',
    entity: 'Voucher',
    entityId: voucher.id,
    description: `Menghanguskan voucher ${voucher.code}`,
  });
}