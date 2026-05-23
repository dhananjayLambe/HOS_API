"use client";

import { backendAxiosClient } from "@/lib/axiosClient";
import type { LabOrderListItem } from "@/lib/labs/api/orders-types";
import { mapLabOrderListItem } from "@/lib/labs/orders/map-order-row";
import type { LabOrderRow } from "@/lib/labs/types";

/** GET /api/labs/orders/assignments/<assignment_id>/ — deterministic drawer hydration. */
export async function fetchLabOrderAssignment(
  assignmentId: string,
  options?: { signal?: AbortSignal; branchLabel?: string },
): Promise<LabOrderRow> {
  const { data } = await backendAxiosClient.get<LabOrderListItem>(
    `labs/orders/assignments/${encodeURIComponent(assignmentId)}/`,
    { signal: options?.signal },
  );
  return mapLabOrderListItem(data, options?.branchLabel ?? "");
}
