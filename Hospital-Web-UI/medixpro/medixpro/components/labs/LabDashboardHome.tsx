"use client";

import { LabEmptyState } from "@/components/labs/common/LabEmptyState";
import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabQuickActions } from "@/components/labs/common/LabQuickActions";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { labBtnSecondary } from "@/components/labs/labDesignTokens";
import { MOCK_LAB_COLLECTIONS } from "@/components/labs/mock/collections";
import { MOCK_LAB_ORDERS } from "@/components/labs/mock/orders";
import { MOCK_LAB_DELIVERIES, MOCK_LAB_REPORT_QUEUE } from "@/components/labs/mock/reports";
import { ActionButton } from "@/components/labs/premium/ActionButton";
import { PremiumTable } from "@/components/labs/premium/PremiumTable";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { StatusCard } from "@/components/labs/premium/StatusCard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/authContext";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  FileWarning,
  Home,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const KPI_ICONS: LucideIcon[] = [ClipboardList, Home, CalendarDays, FileWarning, CircleCheck, AlertTriangle];

function linkSecondaryClass(extra?: string) {
  return cn(labBtnSecondary, "h-9 px-3 text-xs no-underline", extra);
}

export function LabDashboardHome() {
  const { user } = useAuth();
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || "there";

  const pendingOrders = MOCK_LAB_ORDERS.filter((o) => o.status === "PENDING").length;
  const todayCollections = MOCK_LAB_COLLECTIONS.length;
  const reportsPending = MOCK_LAB_REPORT_QUEUE.filter((r) => r.status === "PENDING_UPLOAD").length;
  const failedDeliveries = MOCK_LAB_DELIVERIES.filter((d) => d.status === "FAILED").length;

  const incomingQueue = MOCK_LAB_ORDERS.filter((o) => o.status === "PENDING");
  const reportsPendingRows = MOCK_LAB_REPORT_QUEUE.filter((r) => r.status === "PENDING_UPLOAD");
  const deliveryFailures = MOCK_LAB_DELIVERIES.filter((d) => d.status === "FAILED");

  const kpiItems: { title: string; value: number; hint?: string }[] = [
    { title: "Pending orders", value: pendingOrders },
    { title: "Today's collections", value: todayCollections },
    { title: "Today's appointments", value: 2, hint: "Walk-in / visit" },
    { title: "Reports pending upload", value: reportsPending },
    { title: "Completed today", value: 4 },
    { title: "Failed deliveries", value: failedDeliveries },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <LabPageHeader
        title={`Lab console — ${name}`}
        description="Operational overview: queues, collections, and delivery at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-6">
        {kpiItems.map((item, i) => (
          <StatusCard
            key={item.title}
            title={item.title}
            value={item.value}
            hint={item.hint}
            icon={KPI_ICONS[i % KPI_ICONS.length]}
          />
        ))}
      </div>

      <SectionCard
        title="Incoming orders queue"
        subtitle="New referrals and walk-ins awaiting acceptance or slot confirmation."
        action={
          <Link href="/lab-dashboard/orders/" className={linkSecondaryClass()}>
            Open orders
          </Link>
        }
      >
        {incomingQueue.length === 0 ? (
          <div className="p-5 sm:p-6">
            <LabEmptyState title="No pending orders" description="New doctor referrals will appear here." />
          </div>
        ) : (
          <PremiumTable maxHeightClass="max-h-[min(22rem,50vh)]" className="rounded-none border-0 bg-transparent shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingQueue.map((o) => (
                  <TableRow key={o.id} className="border-0">
                    <TableCell className="font-semibold text-[#111827]">{o.patient}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-[#6B7280]">
                      {o.tests.map((t) => t.name).join(", ")}
                    </TableCell>
                    <TableCell className="text-[#111827]">{o.collectionType === "HOME" ? "Home" : "Visit"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-[#6B7280]">{o.preferredSlot}</TableCell>
                    <TableCell>
                      <LabStatusBadge domain="order" status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex min-h-[44px] flex-wrap items-center justify-end gap-1.5 sm:min-h-0">
                        <ActionButton className="h-9 px-3 text-xs" onClick={() => toast.success("Accepted (mock)")}>
                          Accept
                        </ActionButton>
                        <ActionButton variant="secondary" className="h-9 px-3 text-xs" onClick={() => toast.message("Rejected (mock)")}>
                          Reject
                        </ActionButton>
                        <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[#6B7280] hover:bg-[#F4F1FF]" asChild>
                          <Link href="/lab-dashboard/orders/">View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PremiumTable>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <SectionCard
          title="Today's collections"
          subtitle="Home visits and on-site draws with assignee and slot context."
          action={
            <Link href="/lab-dashboard/home-collections/" className={linkSecondaryClass()}>
              Collections
            </Link>
          }
        >
          {MOCK_LAB_COLLECTIONS.length === 0 ? (
            <div className="p-5 sm:p-8">
              <LabEmptyState title="No collections today" description="Assign collections from the home collections screen." />
            </div>
          ) : (
            <PremiumTable maxHeightClass="max-h-[min(20rem,45vh)]" className="rounded-none border-0 bg-transparent shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Patient</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Assignment note</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[1%]"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_LAB_COLLECTIONS.map((c) => (
                    <TableRow key={c.id} className="border-0">
                      <TableCell className="font-semibold text-[#111827]">{c.patientName}</TableCell>
                      <TableCell className="max-w-[160px] text-[#6B7280]">—</TableCell>
                      <TableCell className="whitespace-nowrap text-[#111827]">
                        {c.slotDateLabel} {c.slotTimeLabel}
                      </TableCell>
                      <TableCell className="text-[#111827]">{c.assigneeName ?? "—"}</TableCell>
                      <TableCell>
                        <LabStatusBadge domain="collection" status={c.status} />
                      </TableCell>
                      <TableCell>
                        <LabQuickActions keys={["assign", "call", "whatsapp"]} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PremiumTable>
          )}
        </SectionCard>

        <SectionCard
          title="Reports pending upload"
          subtitle="PDFs waiting for verification before patient delivery."
          action={
            <Link href="/lab-dashboard/reports/" className={linkSecondaryClass()}>
              Reports
            </Link>
          }
        >
          {reportsPendingRows.length === 0 ? (
            <div className="p-5 sm:p-8">
              <LabEmptyState title="Queue clear" description="Nothing waiting for PDF upload." />
            </div>
          ) : (
            <PremiumTable maxHeightClass="max-h-[min(20rem,45vh)]" className="rounded-none border-0 bg-transparent shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsPendingRows.map((r) => (
                    <TableRow key={r.id} className="border-0">
                      <TableCell className="font-semibold text-[#111827]">{r.patient}</TableCell>
                      <TableCell className="text-[#111827]">{r.tests}</TableCell>
                      <TableCell className="text-[#6B7280]">{r.collectedAt}</TableCell>
                      <TableCell>
                        <LabStatusBadge domain="report" status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionButton className="h-9 px-3 text-xs" onClick={() => toast.message("Open upload (mock)")}>
                          Upload report
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PremiumTable>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Delivery failures"
        subtitle="Channels that need a manual retry or alternate contact path."
        action={
          <Link href="/lab-dashboard/report-delivery/" className={linkSecondaryClass()}>
            Delivery
          </Link>
        }
      >
        {deliveryFailures.length === 0 ? (
          <div className="p-5 sm:p-8">
            <LabEmptyState title="No failed deliveries" description="WhatsApp and link retries will show here." />
          </div>
        ) : (
          <PremiumTable maxHeightClass="max-h-[min(18rem,40vh)]" className="rounded-none border-0 bg-transparent shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Patient</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Retry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryFailures.map((d) => (
                  <TableRow key={d.id} className="border-0">
                    <TableCell className="font-semibold text-[#111827]">{d.patient}</TableCell>
                    <TableCell className="text-[#111827]">{d.channel}</TableCell>
                    <TableCell>
                      <LabStatusBadge domain="delivery" status={d.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex min-h-[44px] items-center justify-end sm:min-h-0">
                        <ActionButton className="h-9 px-3 text-xs" onClick={() => toast.success("Retry queued (mock)")}>
                          Retry
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PremiumTable>
        )}
      </SectionCard>
    </div>
  );
}
