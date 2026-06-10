"use client";

import { FileStack } from "lucide-react";

export function TemplateManagementEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <FileStack className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No templates found</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Create your first template during a consultation and it will appear here.
        </p>
      </div>
    </div>
  );
}
