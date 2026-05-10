"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { MOCK_LAB_APPOINTMENTS } from "@/components/labs/mock/patients";
import { Badge } from "@/components/ui/badge";
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

export function LabVisitAppointmentsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Visit appointments"
        description="Walk-in and imaging — fasting and prep flags matter for radiology."
      />
      {MOCK_LAB_APPOINTMENTS.length === 0 ? (
        <div className="rounded-2xl border border-[color:rgb(15_23_42/0.06)] bg-white/[0.92] p-6 shadow-sm">
          <LabEmptyState title="No appointments" description="Scheduled visits will appear here." />
        </div>
      ) : (
        <LabDataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Prep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LAB_APPOINTMENTS.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.patient}</TableCell>
                  <TableCell>{a.tests}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.date}</TableCell>
                  <TableCell>{a.slot}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.fastingRequired ? (
                        <Badge variant="warning" className="text-[10px]">
                          Fasting
                        </Badge>
                      ) : null}
                      {a.radiologist ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {a.radiologist}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">{a.instructions}</p>
                  </TableCell>
                  <TableCell>
                    <LabStatusBadge domain="appointment" status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => toast.message("Confirm (mock)")}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toast.message("Check in (mock)")}>
                        Check in
                      </Button>
                      <Button size="sm" onClick={() => toast.success("Complete (mock)")}>
                        Complete
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
