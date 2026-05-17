"use client";

import { HomeCollectionRowActions } from "@/components/labs/home-collections/HomeCollectionRowActions";
import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { labTableCellBody } from "@/components/labs/labDesignTokens";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LabCollectionRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

type Props = {
  rows: LabCollectionRow[];
  busyId?: string | null;
  onRowOpen: (row: LabCollectionRow) => void;
  onAssign: (row: LabCollectionRow) => void;
  onStart: (row: LabCollectionRow) => void;
  onCollect: (row: LabCollectionRow) => void;
  onFail: (row: LabCollectionRow) => void;
  onRetry: (row: LabCollectionRow) => void;
};

function patientSubline(row: LabCollectionRow) {
  const parts: string[] = [];
  if (row.patientAge != null) parts.push(String(row.patientAge));
  if (row.patientGender) parts.push(row.patientGender);
  return parts.join(" · ");
}

function testsCell(row: LabCollectionRow) {
  const names = row.testNames.join(", ");
  const more = row.testNamesOverflow > 0 ? ` +${row.testNamesOverflow} more` : "";
  return (
    <div className="max-w-[160px]">
      <p className="text-xs font-medium text-[#6B7280]">{row.testCount} Tests</p>
      <p className={cn("truncate text-sm text-[#111827]", labTableCellBody)}>
        {names}
        {more}
      </p>
    </div>
  );
}

export function HomeCollectionsTable({
  rows,
  busyId,
  onRowOpen,
  onAssign,
  onStart,
  onCollect,
  onFail,
  onRetry,
}: Props) {
  return (
    <LabDataTable className="rounded-none border-0 border-t border-[#ECEBFF] shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Patient</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead>Collection slot</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Collection status</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer border-0" onClick={() => onRowOpen(row)}>
              <TableCell>
                <p className="font-semibold text-[#111827]">{row.patientName}</p>
                <p className="text-xs text-[#6B7280]">{patientSubline(row)}</p>
              </TableCell>
              <TableCell>{testsCell(row)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <p className="text-sm font-medium text-[#111827]">{row.slotDateLabel}</p>
                <p className="text-xs text-[#6B7280]">{row.slotTimeLabel}</p>
              </TableCell>
              <TableCell>
                {row.assigneeName ? (
                  <span className="text-sm text-[#111827]">{row.assigneeName}</span>
                ) : (
                  <Badge variant="outline" className="text-xs font-normal">
                    Unassigned
                  </Badge>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <LabStatusBadge domain="collection" status={row.status} />
              </TableCell>
              <TableCell className="max-w-[140px] text-xs text-[#6B7280]">{row.workflowHint}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <HomeCollectionRowActions
                  row={row}
                  busy={busyId === row.id}
                  onAssign={onAssign}
                  onStart={onStart}
                  onCollect={onCollect}
                  onFail={onFail}
                  onRetry={onRetry}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LabDataTable>
  );
}
