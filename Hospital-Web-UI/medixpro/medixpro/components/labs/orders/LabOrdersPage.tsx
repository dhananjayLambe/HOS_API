"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { labTableCellBody } from "@/components/labs/labDesignTokens";
import { LabFilterBar } from "@/components/labs/common/LabFilterBar";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabQuickActions } from "@/components/labs/common/LabQuickActions";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { LabUrgencyBadge } from "@/components/labs/common/LabUrgencyBadge";
import { OrderDetailSheet } from "@/components/labs/orders/OrderDetailSheet";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { MOCK_LAB_ORDERS } from "@/components/labs/mock/orders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMemo, useState } from "react";

export function LabOrdersPage() {
  const [status, setStatus] = useState<string>("all");
  const [collectionType, setCollectionType] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [selected, setSelected] = useState<LabOrderRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows = useMemo(() => {
    return MOCK_LAB_ORDERS.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (collectionType !== "all" && o.collectionType !== collectionType) return false;
      if (branch !== "all" && o.branch !== branch) return false;
      return true;
    });
  }, [status, collectionType, branch]);

  const openDetail = (o: LabOrderRow) => {
    setSelected(o);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Orders"
        description="Central control for lab requests — filter, open detail, act fast."
      />

      <LabFilterBar>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <Label className="text-xs">Date</Label>
          <Select defaultValue="today">
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <Label className="text-xs">Home / visit</Label>
          <Select value={collectionType} onValueChange={setCollectionType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="HOME">Home</SelectItem>
              <SelectItem value="VISIT">Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[120px] flex-1 flex-col gap-1">
          <Label className="text-xs">Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Baner">Baner</SelectItem>
              <SelectItem value="Hub">Hub</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[120px] flex-1 flex-col gap-1">
          <Label className="text-xs">Urgency</Label>
          <Select defaultValue="all">
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="STAT">STAT</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="ROUTINE">Routine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </LabFilterBar>

      <SectionCard
        title="Order register"
        subtitle="Filtered list — row opens the detail drawer; actions stop propagation."
      >
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
              <TableHead>Branch</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="whitespace-nowrap">Created</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id} className="cursor-pointer border-0" onClick={() => openDetail(o)}>
                <TableCell className="font-mono text-sm font-medium tabular-nums text-[#6B7280]">{o.id}</TableCell>
                <TableCell className="font-semibold text-[#111827]">{o.patient}</TableCell>
                <TableCell className="max-w-[100px] truncate text-sm text-[#6B7280]">{o.doctor}</TableCell>
                <TableCell className={cn("max-w-[140px] truncate", labTableCellBody)}>
                  {o.tests.map((t) => t.name).join(", ")}
                </TableCell>
                <TableCell className="text-sm font-medium text-[#111827]">{o.collectionType === "HOME" ? "Home" : "Visit"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-[#6B7280]">{o.preferredSlot}</TableCell>
                <TableCell className="text-sm font-medium text-[#111827]">{o.branch}</TableCell>
                <TableCell>
                  <LabUrgencyBadge level={o.urgency} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <LabStatusBadge domain="order" status={o.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-[#6B7280]">{o.createdAt}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" onClick={() => openDetail(o)}>
                      View
                    </Button>
                    <LabQuickActions keys={["call", "whatsapp", "more"]} size="sm" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LabDataTable>
      </SectionCard>

      <OrderDetailSheet order={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
