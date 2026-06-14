"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HelpdeskVisitRow } from "@/lib/helpdesk/mapVisitListRow";
import { Download, Eye, FileText, MoreHorizontal } from "lucide-react";

type Props = {
  row: HelpdeskVisitRow;
  onView: () => void;
  onViewPrescription: () => void;
  onDownloadPrescription: () => void;
};

export function VisitRowActions({
  row,
  onView,
  onViewPrescription,
  onDownloadPrescription,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Visit actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View visit
        </DropdownMenuItem>
        {row.hasPrescription && row.prescriptionId ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onViewPrescription}>
              <FileText className="mr-2 h-4 w-4" />
              View prescription
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadPrescription}>
              <Download className="mr-2 h-4 w-4" />
              Download prescription
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
