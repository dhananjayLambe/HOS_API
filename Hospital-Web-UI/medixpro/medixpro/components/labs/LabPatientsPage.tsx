"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { MOCK_LAB_PATIENTS } from "@/components/labs/mock/patients";
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

export function LabPatientsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Patients"
        description="Minimal Phase 1 — diagnostic history expands when API is ready."
      />
      {MOCK_LAB_PATIENTS.length === 0 ? (
        <div className="rounded-2xl border border-[color:rgb(15_23_42/0.06)] bg-white/[0.92] p-6 shadow-sm">
          <LabEmptyState title="No patients" />
        </div>
      ) : (
        <LabDataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Patient</TableHead>
                <TableHead>Last test</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Pending reports</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LAB_PATIENTS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.lastTest}</TableCell>
                  <TableCell>{p.orders}</TableCell>
                  <TableCell>{p.pendingReports}</TableCell>
                  <TableCell className="text-sm">{p.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => toast.message("Patient detail (mock)")}>
                      View
                    </Button>
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
