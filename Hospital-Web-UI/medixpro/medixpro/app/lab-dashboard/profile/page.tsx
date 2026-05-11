"use client";

import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { LabRegistrationPill } from "@/components/labs/LabRegistrationPill";
import { LabBoolBadge } from "@/components/labs/profile/LabBoolBadge";
import { LabDetailRow } from "@/components/labs/profile/LabDetailRow";
import { LabProfileField } from "@/components/labs/profile/LabProfileField";
import { LabProfilePanel } from "@/components/labs/profile/LabProfilePanel";
import { LabProfileSkeleton } from "@/components/labs/profile/LabProfileSkeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { labOperationalRoleLabel } from "@/lib/labs/session/lab-role-labels";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  Building2,
  ClipboardList,
  Headphones,
  LifeBuoy,
  MapPin,
  Shield,
  UserRound,
} from "lucide-react";

function disp(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

function humanizeEnum(value: string) {
  if (!value) return "—";
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Display date without time — e.g. 9 May 2026 */
function formatProfileDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMMM yyyy");
  } catch {
    try {
      return format(new Date(iso), "d MMMM yyyy");
    } catch {
      return "—";
    }
  }
}

function formatBranchStreet(b: {
  address_line_1: string;
  address_line_2: string;
  landmark: string;
}): string {
  const parts = [b.address_line_1, b.address_line_2, b.landmark].map((s) => String(s || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function reportTatLabel(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  if (hours <= 0) return "—";
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export default function LabProfilePage() {
  const { data, isPending, isError, error, refetch } = useLabSession();

  if (isPending && !data) {
    return (
      <div className="space-y-6">
        <LabPageHeader title="Profile" description="Your lab workspace — read-only summary." />
        <LabProfileSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <LabPageHeader title="Profile" description="Your lab workspace — read-only summary." />
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-destructive">Unable to load profile</p>
          <p className="max-w-md text-xs text-muted-foreground">{error?.message ?? "Unknown error"}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const u = data.user;
  const lu = data.lab_user;
  const o = data.organization;
  const b = data.branch;
  const p = data.permissions;

  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || "—";
  const roleLabel = labOperationalRoleLabel(lu.role);
  const orgDisplayName = disp(o.display_name || o.organization_name);
  const contactNumber = disp(o.primary_contact_number);

  return (
    <div className="space-y-6">
      <LabPageHeader title="Profile" description="Operational summary — view only. Updates are handled by MedixPro support." />

      {/* Support — why editing is disabled */}
      <Card className="overflow-hidden border-[#ECEBFF] bg-gradient-to-br from-[#F4F1FF] via-white to-[#FAFAFF] shadow-sm">
        <CardContent className="flex gap-4 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#7C5CFC]/15 text-[#5B3CC4]">
            <Headphones className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-base font-semibold text-[#111827]">Need profile or registration changes?</p>
            <p className="text-sm leading-relaxed text-[#4B5563]">
              This screen is read-only for lab operators. Please contact <span className="font-medium text-[#111827]">MedixPro support</span> to
              update organization details, verification status, or branch information. You will see the latest values here after changes are
              applied.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Verification summary — at-a-glance */}
      <Card className="border-[#ECEBFF] shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] pb-4">
            <Shield className="h-5 w-5 text-[#6D4FF5]" aria-hidden />
            <h2 className="text-base font-semibold text-[#111827]">Verification summary</h2>
          </div>
          <ul className="mt-5 space-y-5">
            <li className="flex gap-4">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7C5CFC] ring-4 ring-[#7C5CFC]/15" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Registration status</p>
                <LabRegistrationPill status={o.registration_status} />
              </div>
            </li>
            <li className="flex gap-4">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#10B981] ring-4 ring-[#10B981]/15" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Lab type</p>
                <p className="text-sm font-semibold text-[#111827]">{humanizeEnum(o.lab_type)}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#F59E0B] ring-4 ring-[#F59E0B]/15" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Orders status</p>
                <div>
                  <LabBoolBadge value={o.is_active_for_orders} tone="activeOrders" />
                  <span className="mt-1 block text-xs text-[#6B7280]">Organization-wide acceptance of new orders</span>
                </div>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <LabProfilePanel icon={UserRound} title="User" description="Your sign-in identity for this lab workspace.">
          <LabProfileField label="Full name" value={fullName} />
          <LabProfileField label="Email" value={disp(u.email)} />
          <LabProfileField label="Phone" value={disp(u.phone_number)} />
          <LabProfileField label="Role" value={roleLabel} />
        </LabProfilePanel>

        <LabProfilePanel icon={Building2} title="Organization" description="Registered lab entity on file.">
          <LabProfileField label="Organization name" value={orgDisplayName} />
          <LabProfileField label="Lab type" value={humanizeEnum(o.lab_type)} />
          <LabProfileField label="Support email" value={disp(o.support_email)} />
          <LabProfileField label="Contact number" value={contactNumber} />
        </LabProfilePanel>
      </div>

      <LabProfilePanel icon={MapPin} title="Branch" description="Location for this session’s branch.">
        <LabProfileField label="Branch name" value={disp(b.branch_name)} />
        <LabProfileField label="Address" value={formatBranchStreet(b)} />
        <LabProfileField label="City" value={disp(b.city)} />
        <LabProfileField label="State" value={disp(b.state)} />
        <LabProfileField label="Pincode" value={disp(b.pincode)} />
      </LabProfilePanel>

      <LabProfilePanel icon={ClipboardList} title="Operations" description="How patients can reach this branch.">
        <LabProfileField label="Home collection available" value={<LabBoolBadge value={b.home_collection_available} />} />
        <LabProfileField label="Walk-in available" value={<LabBoolBadge value={b.walk_in_collection_available} />} />
        <LabProfileField label="Report TAT" value={reportTatLabel(b.report_delivery_hours)} />
      </LabProfilePanel>

      <LabProfilePanel icon={LifeBuoy} title="Verification" description="Account and registration state.">
        <LabProfileField label="Registration status" value={<LabRegistrationPill status={o.registration_status} />} />
        <LabProfileField label="Account" value={<LabBoolBadge value={o.is_verified} tone="accountVerified" />} />
      </LabProfilePanel>

      {/* Advanced — internal identifiers & audit fields */}
      <Accordion type="single" collapsible className="rounded-2xl border border-[#ECEBFF] bg-white px-4 shadow-sm">
        <AccordionItem value="advanced" className="border-0">
          <AccordionTrigger className="py-4 text-left text-sm font-semibold text-[#111827] hover:no-underline">
            Advanced information
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-4 text-xs leading-relaxed text-[#6B7280]">
              Technical and internal fields for troubleshooting. Not required for day-to-day operations.
            </p>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">User & membership</p>
            <LabDetailRow label="User ID" value={<span className="font-mono text-xs">{u.id}</span>} />
            <LabDetailRow label="Username" value={<span className="font-mono text-sm">{disp(u.username)}</span>} />
            <LabDetailRow label="Profile picture URL" value={u.profile_picture ? <span className="break-all text-xs">{u.profile_picture}</span> : "—"} />
            <LabDetailRow label="Lab user ID" value={<span className="font-mono text-xs">{lu.id}</span>} />
            <LabDetailRow label="Operational role (code)" value={<span className="font-mono text-sm">{lu.role}</span>} />
            <LabDetailRow label="Employee code" value={disp(lu.employee_code)} />
            <LabDetailRow label="Primary admin" value={<LabBoolBadge value={lu.is_primary_admin} tone="yesNo" />} />
            <LabDetailRow label="Lab user active" value={<LabBoolBadge value={lu.is_active} tone="yesNo" />} />
            <LabDetailRow label="Lab user created" value={formatProfileDate(lu.created_at)} />
            <LabDetailRow label="Lab user updated" value={formatProfileDate(lu.updated_at)} />

            <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Organization — identifiers</p>
            <LabDetailRow label="Organization ID" value={<span className="font-mono text-xs">{o.id}</span>} />
            <LabDetailRow label="Legal name" value={disp(o.organization_name)} />
            <LabDetailRow label="Organization code" value={<span className="font-mono text-sm">{disp(o.organization_code)}</span>} />
            <LabDetailRow label="Slug" value={<span className="font-mono text-sm">{disp(o.slug)}</span>} />
            <LabDetailRow label="Logo URL" value={o.logo ? <span className="break-all text-xs">{o.logo}</span> : "—"} />
            <LabDetailRow label="Alternate contact" value={disp(o.alternate_contact_number)} />
            <LabDetailRow label="Website" value={o.website ? <span className="break-all text-sm">{o.website}</span> : "—"} />
            <LabDetailRow label="Registration number" value={disp(o.registration_number)} />
            <LabDetailRow label="License number" value={disp(o.license_number)} />
            <LabDetailRow label="PAN" value={disp(o.pan_number)} />
            <LabDetailRow label="GST" value={disp(o.gst_number)} />
            <LabDetailRow label="Owner name" value={disp(o.owner_name)} />
            <LabDetailRow label="Owner designation" value={disp(o.owner_designation)} />
            <LabDetailRow label="Rejection reason" value={o.rejection_reason ? <span className="whitespace-pre-wrap">{o.rejection_reason}</span> : "—"} />
            <LabDetailRow label="Approved on" value={formatProfileDate(o.approved_at)} />
            <LabDetailRow label="Onboarding completed" value={<LabBoolBadge value={o.onboarding_completed} tone="yesNo" />} />
            <LabDetailRow label="Org accepts online orders" value={<LabBoolBadge value={o.accepts_online_orders} tone="yesNo" />} />
            <LabDetailRow label="Home collection (org)" value={<LabBoolBadge value={o.home_collection_available} />} />
            <LabDetailRow label="Walk-in (org)" value={<LabBoolBadge value={o.walk_in_collection_available} />} />
            <LabDetailRow label="Organization record active" value={<LabBoolBadge value={o.is_active} tone="yesNo" />} />
            <LabDetailRow label="Organization created" value={formatProfileDate(o.created_at)} />
            <LabDetailRow label="Organization updated" value={formatProfileDate(o.updated_at)} />

            <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Branch — technical</p>
            <LabDetailRow label="Branch ID" value={<span className="font-mono text-xs">{b.id}</span>} />
            <LabDetailRow label="Branch code" value={<span className="font-mono text-sm">{disp(b.branch_code)}</span>} />
            <LabDetailRow label="Primary branch" value={<LabBoolBadge value={b.is_primary_branch} tone="yesNo" />} />
            <LabDetailRow label="Branch record active" value={<LabBoolBadge value={b.is_active} tone="yesNo" />} />
            <LabDetailRow label="Country" value={disp(b.country)} />
            <LabDetailRow label="Latitude" value={disp(b.latitude)} />
            <LabDetailRow label="Longitude" value={disp(b.longitude)} />
            <LabDetailRow label="Address line 1" value={disp(b.address_line_1)} />
            <LabDetailRow label="Address line 2" value={disp(b.address_line_2)} />
            <LabDetailRow label="Landmark" value={disp(b.landmark)} />
            <LabDetailRow label="Opening time" value={disp(b.opening_time)} />
            <LabDetailRow label="Closing time" value={disp(b.closing_time)} />
            <LabDetailRow label="Home collection radius (km)" value={String(b.home_collection_radius_km)} />
            <LabDetailRow label="Emergency collection" value={<LabBoolBadge value={b.emergency_collection_available} />} />
            <LabDetailRow label="Accepts online orders (branch)" value={<LabBoolBadge value={b.accepts_online_orders} tone="yesNo" />} />
            <LabDetailRow label="Active for orders (branch)" value={<LabBoolBadge value={b.is_active_for_orders} tone="activeOrders" />} />
            <LabDetailRow label="Branch created" value={formatProfileDate(b.created_at)} />
            <LabDetailRow label="Branch updated" value={formatProfileDate(b.updated_at)} />

            <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Permissions (phase 1)</p>
            <LabDetailRow label="Can upload reports" value={<LabBoolBadge value={p.can_upload_reports} tone="yesNo" />} />
            <LabDetailRow label="Can assign collections" value={<LabBoolBadge value={p.can_assign_collections} tone="yesNo" />} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
