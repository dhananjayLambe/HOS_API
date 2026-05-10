"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { MOCK_LAB_REPORT_QUEUE } from "@/components/labs/mock/reports";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FileText, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function LabReportsPage() {
  return (
    <div className="space-y-6">
      <LabPageHeader
        title="Reports"
        description="Upload PDFs, review, approve — patient trust depends on this queue."
      />

      <div className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 text-sm font-semibold">Upload report (Phase 1)</h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="lab-pdf">PDF file</Label>
            <Button id="lab-pdf" variant="outline" className="w-full justify-start sm:w-auto" type="button" onClick={() => toast.message("File picker (mock)")}>
              <FileText className="mr-2 h-4 w-4" />
              Choose PDF
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => toast.message("Preview (mock)")}>
              Preview
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => toast.message("Replace file (mock)")}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Replace
            </Button>
            <Button type="button" size="sm" onClick={() => toast.success("Approved (mock)")}>
              Approve
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => toast.error("Rejected (mock)")}>
              Reject
            </Button>
            <Button type="button" size="sm" variant="default" onClick={() => toast.success("WhatsApp queued (mock)")}>
              <MessageCircle className="mr-1 h-4 w-4" />
              Send WhatsApp
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Comments</Label>
          <Textarea placeholder="Clinical notes or correction requests…" rows={2} className="resize-none" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Checkbox id="abnormal" />
          <Label htmlFor="abnormal" className="text-sm font-normal">
            Flag abnormal for review
          </Label>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Report queue</h2>
        {MOCK_LAB_REPORT_QUEUE.length === 0 ? (
          <div className="rounded-2xl border border-[color:rgb(15_23_42/0.06)] bg-white/[0.92] p-6 shadow-sm">
            <LabEmptyState title="Queue empty" />
          </div>
        ) : (
          <LabDataTable maxHeightClass="max-h-[min(28rem,60vh)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Reviewed by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_LAB_REPORT_QUEUE.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patient}</TableCell>
                    <TableCell>{r.tests}</TableCell>
                    <TableCell>
                      <LabStatusBadge domain="report" status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.uploadedBy ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reviewedBy ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => toast.message("Preview (mock)")}>
                          Preview
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => toast.message("Download (mock)")}>
                          Download
                        </Button>
                        <Button size="sm" onClick={() => toast.success("WhatsApp (mock)")}>
                          Send WA
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
    </div>
  );
}
