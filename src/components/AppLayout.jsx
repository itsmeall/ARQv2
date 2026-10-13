import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useSession } from '@/lib/session';
import AppSidebar, { navForRole } from '@/components/AppSidebar';
import LoadingScreen from '@/components/LoadingScreen';
import NoAccess from '@/components/NoAccess';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function AppLayout() {
  const session = useSession();
  const [open, setOpen] = useState(false);

  if (!session || session.loading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingScreen label="Menyiapkan ruang kerja…" />
      </div>
    );
  }

  if (session.accessError && !session.isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <NoAccess reason={session.accessError} />
      </div>
    );
  }

  const navItems = navForRole(session);
  const tenantName = session.tenant?.name || (session.isPlatformAdmin && !session.appRole ? 'Panel ARQ' : 'ARQ');

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-border bg-card lg:flex">
        <AppSidebar session={session} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[272px] p-0">
            <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
            <AppSidebar session={session} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-heading text-[11px] font-extrabold text-primary-foreground">
            AR
          </span>
          <p className="truncate font-heading text-sm font-bold tracking-tight">{tenantName}</p>
        </div>
      </header>

      <main className="lg:pl-[264px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
          {navItems.length === 0 ? <NoAccess reason={session.accessError} /> : <Outlet />}
        </div>
      </main>
    </div>
  );
}