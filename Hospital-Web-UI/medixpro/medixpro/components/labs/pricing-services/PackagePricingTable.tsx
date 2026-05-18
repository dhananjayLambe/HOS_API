"use client";

import { LabDataTable } from "@/components/labs/common/LabDataTable";
import {
  PricingCatalogBadge,
  PricingExpiredChip,
  PricingHomeCollectionBadge,
  PricingMutedChip,
} from "@/components/labs/pricing-services/PricingCatalogBadge";
import { CatalogPrimaryCell, PricingTatChip } from "@/components/labs/pricing-services/pricing-catalog-cells";
import { PricingServiceRowActions } from "@/components/labs/pricing-services/PricingServiceRowActions";
import {
  catalogTableHeadClass,
  catalogTableRowClass,
} from "@/components/labs/pricing-services/pricing-catalog-table-styles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PackagePricingTableRow } from "@/lib/labs/pricing-services/map-pricing-rows";
import { cn } from "@/lib/utils";

type Props = {
  rows: PackagePricingTableRow[];
  onRowOpen: (row: PackagePricingTableRow) => void;
  dimmed?: boolean;
};

export function PackagePricingTable({ rows, onRowOpen, dimmed }: Props) {
  return (
    <LabDataTable
      className={cn(
        "rounded-none border-0 border-t-0 shadow-none transition-opacity",
        dimmed && "opacity-60",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={catalogTableHeadClass}>Package name</TableHead>
            <TableHead className={catalogTableHeadClass}>MRP</TableHead>
            <TableHead className={catalogTableHeadClass}>Selling price</TableHead>
            <TableHead className={catalogTableHeadClass}>Home collection</TableHead>
            <TableHead className={catalogTableHeadClass}>Fulfillment</TableHead>
            <TableHead className={catalogTableHeadClass}>TAT</TableHead>
            <TableHead className={catalogTableHeadClass}>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={catalogTableRowClass} onClick={() => onRowOpen(row)}>
              <TableCell className="py-2.5">
                <CatalogPrimaryCell
                  primary={row.packageName}
                  secondary={row.includedTestsPreview || `${row.testsCount} tests`}
                  tertiary={row.validityLabel}
                />
              </TableCell>
              <TableCell className="py-2.5 text-sm text-[#6B7280]">{row.mrpDisplay}</TableCell>
              <TableCell className="py-2.5 text-sm font-semibold text-[#111827]">{row.priceDisplay}</TableCell>
              <TableCell className="py-2.5">
                <PricingHomeCollectionBadge supported={row.homeCollectionSupported} />
              </TableCell>
              <TableCell className="py-2.5">
                <PricingMutedChip>{row.fulfillmentLabel}</PricingMutedChip>
              </TableCell>
              <TableCell className="py-2.5">
                <PricingTatChip label={row.tatLabel} />
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex flex-wrap items-center gap-1">
                  <PricingCatalogBadge label={row.displayStatus} />
                  {row.isExpired ? <PricingExpiredChip /> : null}
                </div>
              </TableCell>
              <TableCell className="py-2.5 text-right">
                <PricingServiceRowActions />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LabDataTable>
  );
}
