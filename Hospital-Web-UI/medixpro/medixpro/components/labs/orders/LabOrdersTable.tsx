"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { LabUrgencyBadge } from "@/components/labs/common/LabUrgencyBadge";
import { labTableCellBody } from "@/components/labs/labDesignTokens";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LabOrderRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

type LabOrdersTableProps = {
  rows: LabOrderRow[];
  onRowOpen: (order: LabOrderRow) => void;
};

export function LabOrdersTable({ rows, onRowOpen }: LabOrdersTableProps) {
  return (
    <LabDataTable className="rounded-none border-0 border-t border-[#ECEBFF] shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="whitespace-nowrap">Order ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Slot</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="whitespace-nowrap">Created</TableHead>
            <TableHead className="w-[1%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => (
            <TableRow key={o.assignmentId} className="cursor-pointer border-0" onClick={() => onRowOpen(o)}>
              <TableCell className="font-mono text-sm font-medium tabular-nums text-[#6B7280]">{o.id}</TableCell>
              <TableCell className="font-semibold text-[#111827]">{o.patient}</TableCell>
              <TableCell className="max-w-[100px] truncate text-sm text-[#6B7280]">{o.doctor}</TableCell>
              <TableCell className={cn("max-w-[140px] truncate", labTableCellBody)}>
                {o.tests.map((t) => t.name).join(", ")}
              </TableCell>
              <TableCell className="text-sm font-medium text-[#111827]">
                {o.collectionType === "HOME" ? "Home" : "Visit"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-[#6B7280]">{o.preferredSlot}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <LabUrgencyBadge level={o.urgency} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <LabStatusBadge domain="order" status={o.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-[#6B7280]">{o.createdAt}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowOpen(o);
                  }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LabDataTable>
  );
}
