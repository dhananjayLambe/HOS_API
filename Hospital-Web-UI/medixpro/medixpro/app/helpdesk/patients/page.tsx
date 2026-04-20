"use client";

import { AddPatientMinimalForm } from "@/components/helpdesk/AddPatientMinimalForm";
import { HelpdeskPatientSearch } from "@/components/helpdesk/HelpdeskPatientSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function HelpdeskPatientsPage() {
  const router = useRouter();
  const addPatient = useHelpdeskQueueStore((s) => s.addPatient);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground">Search or add — added patients go straight to the queue</p>
      </div>

      <HelpdeskPatientSearch
        onAddNew={() => setAddOpen(true)}
        onSelectPatient={(id) => {
          router.push(`/helpdesk/queue`);
          useHelpdeskQueueStore.getState().setPreConsultTargetId(id);
        }}
      />

      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setAddOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add New Patient
      </Button>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>New patient</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <AddPatientMinimalForm
              onSubmit={(name, mobile) => {
                addPatient(name, mobile);
                toast.success("Added to queue");
                setAddOpen(false);
                router.push("/helpdesk/queue");
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
