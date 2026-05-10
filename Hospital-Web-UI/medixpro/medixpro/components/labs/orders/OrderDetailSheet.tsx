"use client";

import { LabActivityTimeline } from "@/components/labs/common/LabActivityTimeline";
import { LabQuickActions } from "@/components/labs/common/LabQuickActions";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { LabUrgencyBadge } from "@/components/labs/common/LabUrgencyBadge";
import { labTw } from "@/styles/lab-design-system";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { LabOrderRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

const sectionTitle =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]";
const dtClass = "text-xs font-medium text-[#6B7280]";
const ddClass = "text-sm font-medium text-[#111827]";
const ddMuted = "text-sm text-[#374151]";

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
}: {
  order: LabOrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-[#ECEBFF] bg-white p-0 sm:max-w-lg md:max-w-xl"
      >
        <SheetHeader className="space-y-1 border-b border-[#ECEBFF] bg-[#FAF9FF]/90 px-4 py-4 text-left backdrop-blur-sm sm:px-6">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <SheetTitle className="text-lg font-semibold tracking-tight text-[#111827]">{order.id}</SheetTitle>
            <LabStatusBadge domain="order" status={order.status} />
            <LabUrgencyBadge level={order.urgency} />
          </div>
          <p className={cn("text-sm", labTw.textSecondary)}>{order.patient}</p>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-4 py-5 sm:px-6">
            <section>
              <h3 className={sectionTitle}>Patient</h3>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className={dtClass}>Name</dt>
                  <dd className={ddClass}>{order.patient}</dd>
                </div>
                <div>
                  <dt className={dtClass}>Age / Gender</dt>
                  <dd className={ddMuted}>
                    {order.patientAge} / {order.patientGender}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={dtClass}>Phone</dt>
                  <dd className={ddMuted}>{order.patientPhone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={dtClass}>Address</dt>
                  <dd className={ddMuted}>{order.patientAddress}</dd>
                </div>
              </dl>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Doctor</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className={dtClass}>Name</dt>
                  <dd className={ddClass}>{order.doctor}</dd>
                </div>
                <div>
                  <dt className={dtClass}>Clinic</dt>
                  <dd className={ddMuted}>{order.clinic}</dd>
                </div>
                {order.prescriptionUrl ? (
                  <div>
                    <dt className={dtClass}>Prescription</dt>
                    <dd>
                      <Button variant="link" className="h-auto p-0 text-[#7C5CFC]" asChild>
                        <a href={order.prescriptionUrl}>
                          Open link <ExternalLink className="ml-1 inline h-3 w-3" />
                        </a>
                      </Button>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Investigations</h3>
              <ul className="space-y-2">
                {order.tests.map((t) => (
                  <li
                    key={t.name}
                    className="rounded-xl border border-[#ECEBFF] bg-[#FAF9FF]/50 px-3 py-2.5 text-sm shadow-[0_2px_8px_rgba(124,92,252,0.04)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#111827]">{t.name}</span>
                      <LabUrgencyBadge level={t.urgency} />
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      {t.category} · Home: {t.homeEligible ? "Yes" : "No"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Collection / visit</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className={dtClass}>Type</dt>
                  <dd className={ddClass}>
                    {order.collectionType === "HOME" ? "Home collection" : "Visit / centre"}
                  </dd>
                </div>
                <div>
                  <dt className={dtClass}>Preferred slot</dt>
                  <dd className={ddMuted}>{order.preferredSlot}</dd>
                </div>
                <div>
                  <dt className={dtClass}>Branch</dt>
                  <dd className={ddMuted}>{order.branch}</dd>
                </div>
              </dl>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Activity timeline</h3>
              <LabActivityTimeline events={order.timeline} />
            </section>

            {order.notes ? (
              <>
                <Separator className="bg-[#ECEBFF]" />
                <section>
                  <h3 className={sectionTitle}>Notes</h3>
                  <p className="rounded-xl border border-[color:rgba(124,92,252,0.2)] bg-[#F4F1FF]/80 p-3 text-sm leading-relaxed text-[#374151]">
                    {order.notes}
                  </p>
                </section>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <div className="border-t border-[#ECEBFF] bg-white/95 p-3 backdrop-blur-sm sm:p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Quick actions</p>
          <LabQuickActions
            keys={["call", "whatsapp", "map", "upload", "assign", "complete", "more"]}
            className="justify-start"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
