import { RotateCw, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const MESSAGES = {
  no_membership:
    'Akun Anda belum terhubung ke perusahaan mana pun. Minta admin ARQ mengundang email Anda sebagai anggota tim, reseller, teknisi, atau pelanggan.',
  suspended: 'Akses akun Anda sedang ditangguhkan. Hubungi admin perusahaan Anda.',
  tenant_unavailable:
    'Akses akun Anda belum lengkap — data perusahaan atau keanggotaan Anda tidak dapat dibaca. Coba muat ulang; bila masih gagal, minta admin memeriksa kembali keanggotaan Anda.',
  tenant_missing:
    'Perusahaan yang tertaut ke akun Anda tidak ditemukan lagi. Minta admin ARQ memperbarui keanggotaan Anda.',
  account_unlinked:
    'Akun Anda belum ditautkan ke data pelanggan. Minta admin perusahaan menautkannya.',
  role_unknown:
    'Peran akun Anda belum dikenali. Minta admin ARQ mengatur ulang akses Anda.',
  resolve_failed:
    'Aplikasi gagal menyelesaikan akses akun Anda. Periksa koneksi Anda, lalu coba muat ulang.',
};

export default function NoAccess({ reason, onRetry }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold">Akses belum tersedia</h2>
            <p className="text-sm text-muted-foreground">{MESSAGES[reason] || MESSAGES.no_membership}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                <RotateCw className="mr-2 h-4 w-4" /> Coba lagi
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => base44.auth.logout('/login')}>
              Keluar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}