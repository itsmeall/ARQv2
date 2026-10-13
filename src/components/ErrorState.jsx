import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ErrorState({ title = 'Data gagal dimuat', description, onRetry }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.9} />
        </span>
        <div className="space-y-1">
          <p className="font-heading text-base font-semibold">{title}</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description || 'Hubungan ke server gagal. Periksa koneksi Anda lalu muat ulang.'}
          </p>
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RotateCw className="mr-2 h-4 w-4" /> Coba lagi
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}