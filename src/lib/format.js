const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const formatIDR = (value) => `Rp ${idr.format(Math.round(Number(value) || 0))}`;

export const formatIDRShort = (value) => {
  const n = Math.round(Number(value) || 0);
  const abs = Math.abs(n);
  if (abs >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1000000) return `Rp ${(n / 1000000).toFixed(1).replace('.', ',')} jt`;
  if (abs >= 10000) return `Rp ${Math.round(n / 1000)} rb`;
  return formatIDR(n);
};

export const formatNumber = (value) => idr.format(Number(value) || 0);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthPeriod = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const addHoursISO = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

export const addDaysISO = (days) => new Date(Date.now() + days * 86400 * 1000).toISOString();

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
};

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const formatPeriod = (period, fallback = '—') => {
  if (!period) return fallback;
  const [year, month] = String(period).split('-');
  const idx = Number(month) - 1;
  if (!year || Number.isNaN(idx) || !MONTHS[idx]) return String(period);
  return `${MONTHS[idx]} ${year}`;
};

export const isExpired = (value) => {
  const d = toDate(value);
  return !!d && d.getTime() < Date.now();
};

export const daysUntil = (value) => {
  const d = toDate(value);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export const downloadCSV = (filename, headers, rows) => {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escape).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};