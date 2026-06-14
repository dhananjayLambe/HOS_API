"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ReportRowStatus =
  | "Ready For Review"
  | "Reviewed"
  | "Pending Upload"
  | "Critical"
  | "Processing";

export type DoctorReportRow = {
  id: string;
  patientName: string;
  reportType: string;
  uploaded: string;
  reviewStatus: ReportRowStatus;
};

const reviewStatusBadgeClass: Record<ReportRowStatus, string> = {
  "Ready For Review": "bg-amber-500/15 text-amber-900 dark:text-amber-100 hover:bg-amber-500/15",
  Reviewed: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/15",
  "Pending Upload": "bg-muted text-muted-foreground hover:bg-muted",
  Processing: "bg-sky-500/15 text-sky-900 dark:text-sky-100 hover:bg-sky-500/15",
  Critical: "bg-red-500/15 text-red-900 dark:text-red-100 hover:bg-red-500/15",
};

type DoctorReportsTableProps = {
  reports: DoctorReportRow[];
};

export function DoctorReportsTable({ reports }: DoctorReportsTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Reports Awaiting Review</CardTitle>
        <CardDescription>Reports requiring your attention</CardDescription>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium">No reports available</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Lab reports uploaded for your patients will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Report Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Review Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.patientName}</TableCell>
                  <TableCell>{report.reportType}</TableCell>
                  <TableCell className="text-muted-foreground">{report.uploaded}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={cn("font-normal", reviewStatusBadgeClass[report.reviewStatus])}
                    >
                      {report.reviewStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
