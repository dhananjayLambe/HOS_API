"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { MOCK_LAB_DELIVERIES } from "@/components/labs/mock/reports";
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

export function LabReportDeliveryPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Report delivery"
        description="WhatsApp and link delivery — retry, copy link, audit trail."
      />
      {MOCK_LAB_DELIVERIES.length === 0 ? (
        <div className="rounded-2xl border border-[color:rgb(15_23_42/0.06)] bg-white/[0.92] p-6 shadow-sm">
          <LabEmptyState title="No delivery rows" />
        </div>
      ) : (
        <LabDataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Patient</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Viewed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LAB_DELIVERIES.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.patient}</TableCell>
                  <TableCell>{d.report}</TableCell>
                  <TableCell>{d.channel}</TableCell>
                  <TableCell>
                    <LabStatusBadge domain="delivery" status={d.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{d.sentAt ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{d.viewedAt ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="secondary" onClick={() => toast.success("Retry (mock)")}>
                        Retry
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.message("Link copied (mock)")}>
                        Copy link
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toast.message("Logs (mock)")}>
                        View logs
                      </Button>
                    </div>
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
