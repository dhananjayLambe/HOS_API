"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COL_COUNT = 10;

export function LabOrdersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <LabDataTable className="rounded-none border-0 border-t border-[#ECEBFF] shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: COL_COUNT }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx} className="border-0">
              {Array.from({ length: COL_COUNT }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  <Skeleton className={colIdx === 0 ? "h-4 w-24" : "h-4 w-full max-w-[100px]"} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LabDataTable>
  );
}
