"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabFilterBar } from "@/components/labs/common/LabFilterBar";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabQuickActions } from "@/components/labs/common/LabQuickActions";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { MOCK_LAB_COLLECTIONS } from "@/components/labs/mock/collections";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function LabHomeCollectionsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Home collections"
        description="Field ops — assign, call, mark collected. Route optimization comes later."
      />
      <LabFilterBar>
        {(["Today", "Tomorrow", "Assigned", "Pending", "Collected", "Failed"] as const).map((label) => (
          <Button key={label} type="button" variant="outline" size="sm" className="h-9" onClick={() => toast.message(label)}>
            {label}
          </Button>
        ))}
      </LabFilterBar>
      {MOCK_LAB_COLLECTIONS.length === 0 ? (
        <div className="rounded-2xl border border-[color:rgb(15_23_42/0.06)] bg-white/[0.92] p-6 shadow-sm">
          <LabEmptyState title="No collections in this view" description="Switch filters or check tomorrow's roster." />
        </div>
      ) : (
        <LabDataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Patient</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LAB_COLLECTIONS.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.patient}</TableCell>
                  <TableCell className="max-w-[200px] text-muted-foreground">{c.address}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.slot}</TableCell>
                  <TableCell>{c.assignee ?? "—"}</TableCell>
                  <TableCell>
                    <LabStatusBadge domain="collection" status={c.status} />
                  </TableCell>
                  <TableCell className="text-sm">{c.phone}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="secondary" onClick={() => toast.success("Started (mock)")}>
                        Mark started
                      </Button>
                      <Button size="sm" onClick={() => toast.success("Collected (mock)")}>
                        Collected
                      </Button>
                      <LabQuickActions keys={["call", "whatsapp", "map", "more"]} size="sm" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </LabDataTable>
      )}
      <div className="rounded-xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground shadow-sm">
        <span className="font-medium text-foreground">Detail actions:</span> reschedule, cancel, open maps — use row
        menu (mock) or expand sheet in a later phase.
      </div>
    </div>
  );
}
