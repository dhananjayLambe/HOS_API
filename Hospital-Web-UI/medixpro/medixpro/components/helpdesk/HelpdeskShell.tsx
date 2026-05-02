"use client";

import HelpdeskLayout from "@/components/helpdesk/HelpdeskLayout";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";

export function HelpdeskShell({ children }: { children: React.ReactNode }) {
  return (
    <HelpdeskLayout>
      <Toaster richColors position="top-right" />
      <RadixToaster />
      {children}
    </HelpdeskLayout>
  );
}
