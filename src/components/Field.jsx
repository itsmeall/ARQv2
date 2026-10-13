import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Field({ label, children, hint, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}