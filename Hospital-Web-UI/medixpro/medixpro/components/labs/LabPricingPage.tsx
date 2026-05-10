"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { MOCK_LAB_SERVICES } from "@/components/labs/mock/patients";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LabPricingPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title="Pricing & services"
        description="Admin-only in early rollout — test pricing, packages, home eligibility, TAT."
      />
      <div className="rounded-xl border border-chart-5/25 bg-gradient-to-r from-chart-5/10 via-chart-5/5 to-primary/[0.04] px-3 py-2.5 text-sm text-foreground shadow-sm">
        <Badge variant="warning" className="mr-2">
          Admin
        </Badge>
        Changes here should sync with branch pricing API in a later phase.
      </div>
      <LabDataTable>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Test</TableHead>
              <TableHead>Price (₹)</TableHead>
              <TableHead>Home collection</TableHead>
              <TableHead>TAT (h)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_LAB_SERVICES.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.test}</TableCell>
                <TableCell>{s.price}</TableCell>
                <TableCell>{s.homeCollection ? "Yes" : "No"}</TableCell>
                <TableCell>{s.tatHours}</TableCell>
                <TableCell>{s.active ? "Active" : "Inactive"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LabDataTable>
    </div>
  );
}
