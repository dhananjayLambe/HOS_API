"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { backendAxiosClient } from "@/lib/axiosClient";
import { Loader2 } from "lucide-react";

const SECTION_LABELS: Record<string, string> = {
  vitals: "Vitals",
  chief_complaint: "Chief Complaint",
  allergies: "Allergies",
  medical_history: "Medical History",
};

interface ViewPreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
}

export function ViewPreDrawer({ open, onOpenChange, encounterId }: ViewPreDrawerProps) {
  const [sections, setSections] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !encounterId) return;
    setLoading(true);
    const codes = ["vitals", "chief_complaint", "allergies", "medical_history"];
    Promise.all(
      codes.map((code) =>
        backendAxiosClient
          .get(`/consultations/pre-consult/encounter/${encounterId}/section/${code}/`)
          .then((res) => ({ code, data: res.data?.data }))
          .catch(() => ({ code, data: null }))
      )
    )
      .then((results) => {
        const next: Record<string, unknown> = {};
        results.forEach(({ code, data }) => {
          next[code] = data;
        });
        setSections(next);
      })
      .finally(() => setLoading(false));
  }, [open, encounterId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pre-Consultation Details</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            (Object.entries(sections) as [string, unknown][]).map(([code, data]) => (
              <div key={code} className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {SECTION_LABELS[code] ?? code}
                </h3>
                {data != null && typeof data === "object" && Object.keys(data as object).length > 0 ? (
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
