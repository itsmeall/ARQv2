import { Card, CardContent } from '@/components/ui/card';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="border-dashed border-border/70 bg-card/60 shadow-none">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        {Icon ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </span>
        ) : null}
        <div className="space-y-1">
          <p className="font-heading text-base font-semibold">{title}</p>
          {description ? <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}