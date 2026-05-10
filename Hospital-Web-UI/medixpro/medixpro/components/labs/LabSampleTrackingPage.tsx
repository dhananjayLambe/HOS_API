"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabFilterBar } from "@/components/labs/common/LabFilterBar";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { MOCK_LAB_SAMPLES } from "@/components/labs/mock/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function LabSampleTrackingPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Sample tracking"
        description="Barcode search and scanner UX will plug in here — lifecycle is status-driven."
      />
      <LabFilterBar>
        <Input className="h-9 max-w-xs" placeholder="Scan or type barcode…" onKeyDown={(e) => e.key === "Enter" && toast.message("Search (mock)")} />
        <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => toast.message("Find sample (mock)")}>
          Search
        </Button>
      </LabFilterBar>
      {MOCK_LAB_SAMPLES.length === 0 ? (
        <div className="rounded-2xl border border-[color:rgb(15_23_42/0.06)] bg-white/[0.92] p-6 shadow-sm">
          <LabEmptyState title="No samples" description="Samples appear when collections sync." />
        </div>
      ) : (
        <LabDataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Barcode</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Processing</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LAB_SAMPLES.map((s) => (
                <TableRow key={s.barcode}>
                  <TableCell className="font-mono text-sm font-medium">{s.barcode}</TableCell>
                  <TableCell>{s.patient}</TableCell>
                  <TableCell>{s.test}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{s.collectedAt}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{s.receivedAt ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{s.processingAt ?? "—"}</TableCell>
                  <TableCell>
                    <LabStatusBadge domain="sample" status={s.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </LabDataTable>
      )}
    </div>
  );
}
