"use client";

import { CheckCircle2, Download, FileText, Loader2, MessageCircle, MoreHorizontal, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DoctorReportsPageSize } from "@/lib/api/doctor-reports-dashboard";
import { cn } from "@/lib/utils";

export type ReportRowStatus = "Ready For Review" | "Pending Upload";

export type DoctorReportRow = {
  id: string;
  reportId?: string;
  patientId: string;
  encounterId?: string;
  visitDate?: string;
  patientName: string;
  reportType: string;
  uploaded: string;
  uploadedAt?: string;
  reviewStatus: ReportRowStatus;
  priority?: "NORMAL" | "HIGH" | "CRITICAL";
  isCritical?: boolean;
  doctorAcknowledged?: boolean;
  whatsappSent?: boolean;
};

const reviewStatusBadgeClass: Record<ReportRowStatus, string> = {
  "Ready For Review": "bg-amber-500/15 text-amber-900 dark:text-amber-100 hover:bg-amber-500/15",
  "Pending Upload": "bg-muted text-muted-foreground hover:bg-muted",
};

const priorityBadgeClass: Record<"HIGH" | "CRITICAL", string> = {
  HIGH: "bg-amber-500/15 text-amber-900 dark:text-amber-100 hover:bg-amber-500/15",
  CRITICAL: "bg-destructive/15 text-destructive hover:bg-destructive/15",
};

function showPriorityBadge(priority?: DoctorReportRow["priority"], isCritical?: boolean): boolean {
  return isCritical === true || priority === "HIGH" || priority === "CRITICAL";
}

function priorityLabel(priority?: DoctorReportRow["priority"], isCritical?: boolean): string {
  if (isCritical || priority === "CRITICAL") return "Critical";
  if (priority === "HIGH") return "High";
  return "Normal";
}

type DoctorReportsTableProps = {
  reports: DoctorReportRow[];
  loading?: boolean;
  isRefreshing?: boolean;
  page?: number;
  pageSize?: DoctorReportsPageSize;
  totalCount?: number;
  pageSizeOptions?: readonly DoctorReportsPageSize[];
  downloadingReportId?: string | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: DoctorReportsPageSize) => void;
  onOpenPatient?: (report: DoctorReportRow) => void;
  onOpenReport?: (report: DoctorReportRow) => void;
  onDownloadReport?: (report: DoctorReportRow) => void;
};

export function DoctorReportsTable({
  reports,
  loading,
  isRefreshing,
  page = 1,
  pageSize = 10,
  totalCount = 0,
  pageSizeOptions = [5, 10, 25, 50],
  downloadingReportId,
  onPageChange,
  onPageSizeChange,
  onOpenPatient,
  onOpenReport,
  onDownloadReport,
}: DoctorReportsTableProps) {
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
  const hasRowActions = onOpenPatient || onOpenReport || onDownloadReport;
  const rangeStart = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Report Work Queue</CardTitle>
          <CardDescription>
            Uploaded reports awaiting review and completed tests pending upload
          </CardDescription>
        </div>
        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value) as DoctorReportsPageSize)}
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  Show {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: pageSize }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No reports available</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Lab reports uploaded for your patients will appear here.
            </p>
          </div>
        ) : (
          <div className="relative">
            {isRefreshing ? (
              <div className="absolute inset-0 z-10 space-y-2 rounded-md bg-background/70 p-1 backdrop-blur-[1px]">
                {Array.from({ length: Math.min(reports.length, pageSize) }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Review Status</TableHead>
                  {hasRowActions ? <TableHead className="w-10" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const canOpenReport =
                    report.reviewStatus === "Ready For Review" && Boolean(report.reportId);
                  const isDownloading = downloadingReportId === report.reportId;
                  const showPriority = showPriorityBadge(report.priority, report.isCritical);

                  return (
                    <TableRow
                      key={report.id}
                      className={cn(
                        onOpenReport && canOpenReport ? "cursor-pointer" : undefined,
                        report.isCritical && "border-l-2 border-l-destructive"
                      )}
                      onClick={() => {
                        if (onOpenReport && canOpenReport) onOpenReport(report);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{report.patientName}</span>
                          {report.doctorAcknowledged ? (
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-emerald-600"
                              aria-label="Doctor acknowledged"
                            />
                          ) : null}
                          {report.whatsappSent ? (
                            <MessageCircle
                              className="h-3.5 w-3.5 text-blue-600"
                              aria-label="WhatsApp sent"
                            />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{report.reportType}</TableCell>
                      <TableCell className="text-muted-foreground">{report.uploaded}</TableCell>
                      <TableCell>
                        {showPriority ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-normal",
                              report.isCritical || report.priority === "CRITICAL"
                                ? priorityBadgeClass.CRITICAL
                                : priorityBadgeClass.HIGH
                            )}
                          >
                            {priorityLabel(report.priority, report.isCritical)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className={cn("font-normal", reviewStatusBadgeClass[report.reviewStatus])}
                        >
                          {report.reviewStatus}
                        </Badge>
                      </TableCell>
                      {hasRowActions ? (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onOpenPatient ? (
                                <DropdownMenuItem onClick={() => onOpenPatient(report)}>
                                  <User className="mr-2 h-4 w-4" />
                                  Open Patient
                                </DropdownMenuItem>
                              ) : null}
                              {onOpenReport ? (
                                <DropdownMenuItem
                                  disabled={!canOpenReport}
                                  onClick={() => onOpenReport(report)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Open Report
                                </DropdownMenuItem>
                              ) : null}
                              {onDownloadReport ? (
                                <DropdownMenuItem
                                  disabled={!canOpenReport || isDownloading}
                                  onClick={() => onDownloadReport(report)}
                                >
                                  {isDownloading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                  )}
                                  Download Report
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {onPageChange && totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {totalCount}
                </span>
                <div className="flex items-center gap-3">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isRefreshing}
                      onClick={() => onPageChange(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isRefreshing}
                      onClick={() => onPageChange(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            ) : totalCount > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {totalCount}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
