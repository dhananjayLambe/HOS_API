"use client";

import { AddPatientMinimalForm } from "./AddPatientMinimalForm";
import { helpdeskBottomNavItems, helpdeskNavItems, type HelpdeskNavItem } from "./helpdeskNavConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/authContext";
import { getRoleRedirectPath } from "@/lib/jwtUtils";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import { cn } from "@/lib/utils";
import { Menu, Mic, Plus, Search } from "lucide-react";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function NavLinkButton({
  item,
  active,
  onNavigate,
}: {
  item: HelpdeskNavItem;
  active: boolean;
  onNavigate: (item: HelpdeskNavItem) => void;
}) {
  if (item.action === "preconsult") {
    return (
      <button
        type="button"
        onClick={() => onNavigate(item)}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted-foreground transition-colors",
          active && "bg-primary/10 text-primary"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" aria-hidden />
        <span className="leading-none">{item.label}</span>
      </button>
    );
  }
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
  onAfterNavigate,
}: {
  item: HelpdeskNavItem;
  active: boolean;
  onNavigate: (item: HelpdeskNavItem) => void;
  onAfterNavigate?: () => void;
}) {
  if (item.action === "preconsult") {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate(item);
          onAfterNavigate?.();
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
          active && "bg-primary/10 text-primary"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
      </button>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={() => onAfterNavigate?.()}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
        active && "bg-primary/10 text-primary"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function HelpdeskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, sessionChecked } = useAuth();
  const setHeaderSearch = useHelpdeskQueueStore((s) => s.setHeaderSearch);
  const headerSearch = useHelpdeskQueueStore((s) => s.headerSearch);
  const addPatient = useHelpdeskQueueStore((s) => s.addPatient);
  const openPreConsultFlow = useHelpdeskQueueStore((s) => s.openPreConsultFlow);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);

  useEffect(() => {
    if (!sessionChecked) return;
    if (role?.toLowerCase() !== "helpdesk") {
      router.replace(getRoleRedirectPath(role));
    }
  }, [role, sessionChecked, router]);

  const handleNav = (item: HelpdeskNavItem) => {
    if (item.action === "preconsult") {
      router.push("/helpdesk/queue");
      openPreConsultFlow();
    } else {
      router.push(item.href);
    }
    setMobileSidebarOpen(false);
  };

  const isActive = (item: HelpdeskNavItem) => {
    if (item.href === "/helpdesk/queue") return pathname === "/helpdesk/queue";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (role?.toLowerCase() !== "helpdesk") {
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/helpdesk/queue" className="min-w-0 flex-1 text-base font-semibold tracking-tight text-foreground">
              MedixPro
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <NotificationDropdown />
              <UserNav />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search patient..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="h-11 flex-1 rounded-full border-border bg-background pl-9 pr-11 shadow-sm"
                aria-label="Search patient"
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Voice search (coming soon)"
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              aria-label="Add patient"
              onClick={() => setAddPatientOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border/80 bg-background py-4 lg:flex">
          <nav className="flex flex-col gap-1 px-2">
            {helpdeskNavItems.map((item) => (
              <SidebarLink
                key={item.label}
                item={item}
                active={isActive(item)}
                onNavigate={handleNav}
              />
            ))}
          </nav>
        </aside>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="space-y-0 border-b px-4 py-4 text-left">
              <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-2" aria-label="Helpdesk navigation">
              {helpdeskNavItems.map((item) => (
                <SidebarLink
                  key={item.label}
                  item={item}
                  active={isActive(item)}
                  onNavigate={handleNav}
                  onAfterNavigate={() => setMobileSidebarOpen(false)}
                />
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-3 pb-24 lg:pb-6 lg:pl-6">{children}</main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Helpdesk"
      >
        <div className="flex h-14 max-w-lg mx-auto">
          {helpdeskBottomNavItems.map((item) => (
            <NavLinkButton
              key={item.label}
              item={item}
              active={item.action !== "preconsult" && isActive(item)}
              onNavigate={handleNav}
            />
          ))}
        </div>
      </nav>

      <Sheet open={addPatientOpen} onOpenChange={setAddPatientOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Add patient</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <AddPatientMinimalForm
              onSubmit={(name, mobile) => {
                addPatient(name, mobile);
                toast.success("Added to queue");
                setAddPatientOpen(false);
                router.push("/helpdesk/queue");
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
