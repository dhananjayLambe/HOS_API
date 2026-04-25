"use client";

import { AddPatientDialog } from "@/components/patient/add-patient-dialog";
import type { Patient } from "@/lib/patientContext";
import { useIsMobile } from "@/components/ui/use-mobile";
import { HelpdeskHeaderLiveSearch } from "./HelpdeskHeaderLiveSearch";
import { helpdeskBottomNavItems, helpdeskNavItems, type HelpdeskNavItem } from "./helpdeskNavConfig";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/authContext";
import axiosClient from "@/lib/axiosClient";
import { getRoleRedirectPath } from "@/lib/jwtUtils";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import { cn } from "@/lib/utils";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { Menu, Plus } from "lucide-react";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function NavLinkButton({ item, active }: { item: HelpdeskNavItem; active: boolean }) {
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
  onAfterNavigate,
}: {
  item: HelpdeskNavItem;
  active: boolean;
  onAfterNavigate?: () => void;
}) {
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
  const addPatientFromSearch = useHelpdeskQueueStore((s) => s.addPatientFromSearch);
  const findEntryByPatient = useHelpdeskQueueStore((s) => s.findEntryByPatient);
  const setHighlightQueueEntryId = useHelpdeskQueueStore((s) => s.setHighlightQueueEntryId);
  const isMobile = useIsMobile();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [addDialogContext, setAddDialogContext] = useState<{
    prefillMobile?: string;
    isExistingAccount?: boolean;
    existingRelations?: string[];
    existingPatientAccountId?: string;
  }>({});

  useEffect(() => {
    if (!sessionChecked) return;
    if (role?.toLowerCase() !== "helpdesk") {
      router.replace(getRoleRedirectPath(role));
    }
  }, [role, sessionChecked, router]);

  const isActive = (item: HelpdeskNavItem) => {
    if (item.href === "/helpdesk/queue") return pathname === "/helpdesk/queue";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const handleLiveSelect = (patient: PatientSearchRow) => {
    const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
    const queueEntryId = existing ? existing.id : addPatientFromSearch(patient);
    if (existing) {
      toast.message("Already in queue");
    } else {
      toast.success("Added to queue");
    }
    setHighlightQueueEntryId(queueEntryId);
    router.push("/helpdesk/queue");
  };

  const handleOpenAddNew = () => {
    setAddDialogContext({});
    setAddPatientOpen(true);
  };

  const handleAddProfileFromSearch = async (patient: PatientSearchRow) => {
    if (!patient.mobile) return;
    const normalizedMobile = patient.mobile.replace(/\D/g, "").slice(-10);
    if (normalizedMobile.length !== 10) {
      toast.error("Invalid mobile number for selected patient.");
      return;
    }

    try {
      const checkResponse = await axiosClient.post("/patients/check-mobile/", {
        mobile: normalizedMobile,
      });

      const existingPatientAccountId = checkResponse.data?.patient_account_id;
      if (!checkResponse.data?.exists || !existingPatientAccountId) {
        toast.error("Could not load account for this mobile. Please try again.");
        return;
      }

      const existingRelations: string[] = Array.from(
        new Set(
          (checkResponse.data?.profiles || [])
            .map((profile: { relation?: string }) => profile?.relation?.toLowerCase())
            .filter((relation: string | undefined): relation is string => Boolean(relation))
        )
      );

      setAddDialogContext({
        prefillMobile: normalizedMobile,
        isExistingAccount: true,
        existingRelations,
        existingPatientAccountId,
      });
      setAddPatientOpen(true);
    } catch {
      toast.error("Failed to load profile details. Please try again.");
    }
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
            <HelpdeskHeaderLiveSearch
              onSelectPatient={handleLiveSelect}
              onAddNew={handleOpenAddNew}
              onAddProfile={handleAddProfileFromSearch}
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              aria-label="Add patient"
              onClick={handleOpenAddNew}
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
              <SidebarLink key={item.label} item={item} active={isActive(item)} />
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
        <div className="mx-auto flex h-14 max-w-lg">
          {helpdeskBottomNavItems.map((item) => (
            <NavLinkButton key={item.label} item={item} active={isActive(item)} />
          ))}
        </div>
      </nav>

      <AddPatientDialog
        open={addPatientOpen}
        onOpenChange={(open) => {
          setAddPatientOpen(open);
          if (!open) setAddDialogContext({});
        }}
        onPatientAdded={(patient: Patient) => {
          const existing = findEntryByPatient({ id: patient.id, mobile: patient.mobile });
          const queueEntryId = existing ? existing.id : addPatientFromSearch(patient);
          if (existing) {
            toast.message("Already in queue");
          } else {
            toast.success("Added to queue");
          }
          setHighlightQueueEntryId(queueEntryId);
          router.push("/helpdesk/queue");
        }}
        syncGlobalPatientContext={false}
        submitLabel="+ Add to Queue"
        presentation={isMobile ? "bottom-sheet" : "default"}
        prefillMobile={addDialogContext.prefillMobile}
        isExistingAccount={addDialogContext.isExistingAccount}
        existingRelations={addDialogContext.existingRelations}
        existingPatientAccountId={addDialogContext.existingPatientAccountId}
      />
    </div>
  );
}
