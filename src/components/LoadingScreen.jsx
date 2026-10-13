export default function LoadingScreen({ label = 'Menyiapkan data…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}