"use client";

import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function LabSettingsPage() {
  return (
    <div className="space-y-6">
      <LabPageHeader
        title="Settings"
        description="Minimal Phase 1 shells — wire to API when lab settings endpoints exist."
      />

      <section className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">WhatsApp</h2>
        <div className="grid max-w-md gap-3">
          <div className="space-y-1">
            <Label>Business number</Label>
            <Input placeholder="+91 …" disabled />
          </div>
          <Button type="button" size="sm" className="w-fit" variant="secondary" onClick={() => toast.message("Save (mock)")}>
            Save
          </Button>
        </div>
      </section>

      <Separator />

      <section className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Branch & collection</h2>
        <div className="grid max-w-md gap-3">
          <div className="space-y-1">
            <Label>Collection radius (km)</Label>
            <Input type="number" placeholder="12" disabled />
          </div>
          <div className="space-y-1">
            <Label>Default report TAT (hours)</Label>
            <Input type="number" placeholder="24" disabled />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">Logo and report header — configure when assets API is ready.</p>
      </section>
    </div>
  );
}
