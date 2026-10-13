import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MAP = {
  available: ['Tersedia', 'border-sky-200 bg-sky-50 text-sky-700'],
  allocated: ['Di reseller', 'border-violet-200 bg-violet-50 text-violet-700'],
  sold: ['Terjual', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  void: ['Hangus', 'border-slate-200 bg-slate-100 text-slate-600'],
  expired: ['Kadaluarsa', 'border-orange-200 bg-orange-50 text-orange-700'],
  unpaid: ['Belum bayar', 'border-rose-200 bg-rose-50 text-rose-700'],
  paid: ['Lunas', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  overdue: ['Menunggak', 'border-amber-200 bg-amber-50 text-amber-700'],
  open: ['Baru', 'border-sky-200 bg-sky-50 text-sky-700'],
  in_progress: ['Dikerjakan', 'border-violet-200 bg-violet-50 text-violet-700'],
  waiting: ['Menunggu', 'border-amber-200 bg-amber-50 text-amber-700'],
  resolved: ['Selesai', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  closed: ['Ditutup', 'border-slate-200 bg-slate-100 text-slate-600'],
  active: ['Aktif', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  inactive: ['Nonaktif', 'border-slate-200 bg-slate-100 text-slate-600'],
  trial: ['Uji coba', 'border-sky-200 bg-sky-50 text-sky-700'],
  suspended: ['Ditangguhkan', 'border-amber-200 bg-amber-50 text-amber-700'],
  isolated: ['Terisolasi', 'border-rose-200 bg-rose-50 text-rose-700'],
  terminated: ['Berhenti', 'border-slate-200 bg-slate-100 text-slate-600'],
  invited: ['Diundang', 'border-sky-200 bg-sky-50 text-sky-700'],
  urgent: ['Urgent', 'border-rose-200 bg-rose-50 text-rose-700'],
  high: ['Tinggi', 'border-amber-200 bg-amber-50 text-amber-700'],
  medium: ['Sedang', 'border-sky-200 bg-sky-50 text-sky-700'],
  low: ['Rendah', 'border-slate-200 bg-slate-100 text-slate-600'],
  income: ['Pemasukan', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  expense: ['Pengeluaran', 'border-rose-200 bg-rose-50 text-rose-700'],
  allocation: ['Alokasi', 'border-violet-200 bg-violet-50 text-violet-700'],
  sale: ['Penjualan', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  return: ['Pengembalian', 'border-amber-200 bg-amber-50 text-amber-700'],
  hotspot: ['Hotspot', 'border-sky-200 bg-sky-50 text-sky-700'],
  pppoe: ['PPPoE', 'border-violet-200 bg-violet-50 text-violet-700'],
  owner_admin: ['Pemilik', 'border-primary/20 bg-primary/10 text-primary'],
  admin: ['Admin', 'border-indigo-200 bg-indigo-50 text-indigo-700'],
  reseller: ['Reseller', 'border-violet-200 bg-violet-50 text-violet-700'],
  technician: ['Teknisi', 'border-amber-200 bg-amber-50 text-amber-700'],
  customer: ['Pelanggan', 'border-sky-200 bg-sky-50 text-sky-700'],
  cash: ['Tunai', 'border-slate-200 bg-slate-100 text-slate-600'],
  transfer: ['Transfer', 'border-sky-200 bg-sky-50 text-sky-700'],
  qris: ['QRIS', 'border-violet-200 bg-violet-50 text-violet-700'],
  other: ['Lainnya', 'border-slate-200 bg-slate-100 text-slate-600'],
  gangguan: ['Gangguan', 'border-rose-200 bg-rose-50 text-rose-700'],
  instalasi: ['Instalasi', 'border-sky-200 bg-sky-50 text-sky-700'],
  perangkat: ['Perangkat', 'border-amber-200 bg-amber-50 text-amber-700'],
  tagihan: ['Tagihan', 'border-violet-200 bg-violet-50 text-violet-700'],
  lainnya: ['Lainnya', 'border-slate-200 bg-slate-100 text-slate-600'],
  starter: ['Starter', 'border-slate-200 bg-slate-100 text-slate-600'],
  business: ['Business', 'border-sky-200 bg-sky-50 text-sky-700'],
  enterprise: ['Enterprise', 'border-violet-200 bg-violet-50 text-violet-700'],
};

export default function StatusBadge({ value, className }) {
  const [label, classes] = MAP[value] || [value || '—', 'border-border bg-muted text-muted-foreground'];
  return (
    <Badge
      variant="outline"
      className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', classes, className)}
    >
      {label}
    </Badge>
  );
}