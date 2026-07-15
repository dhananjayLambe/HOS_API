"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isLabProfileMissingError } from "@/lib/labs/session/lab-session-errors";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { sessionHasOperationalAccess } from "@/lib/labs/session/lab-session-types";
import { CheckCircle2, Clock, Loader2, ShieldAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type StatusScreenProps = {
  title: string;
  description: string;
  badge: string;
  badgeClassName: string;
  children?: ReactNode;
  footer?: ReactNode;
};

function StatusScreen({
  title,
  description,
  badge,
  badgeClassName,
  children,
  footer,
}: StatusScreenProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-10">
      <Card className="w-full border-primary/15 shadow-sm">
        <CardContent className="px-5 py-8 text-center md:px-8 md:py-10">
          <div className="mb-5 flex justify-center">{children}</div>
          <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground md:text-base">{description}</p>
          <div className="mb-6 rounded-lg border bg-card p-4 text-left text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Current status</span>
              <Badge className={badgeClassName}>{badge}</Badge>
            </div>
          </div>
          {footer}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingScreen({ displayName }: { displayName?: string }) {
  return (
    <StatusScreen
      title="Registration submitted"
      description={
        displayName
          ? `Thank you! ${displayName} has been submitted successfully.`
          : "Thank you! Your laboratory registration has been submitted successfully."
      }
      badge="PENDING APPROVAL"
      badgeClassName="bg-amber-100 text-amber-900 hover:bg-amber-100"
      footer={
        <div className="space-y-4 text-left text-sm">
          <p className="font-medium text-foreground">Our team is verifying</p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> License
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> GST
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Address
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Contact details
            </li>
          </ul>
          <p className="text-muted-foreground">
            Estimated approval: <span className="font-medium text-foreground">24–48 hours</span>
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login/">Back to login</Link>
          </Button>
        </div>
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <Clock className="h-8 w-8 text-amber-700" />
      </div>
    </StatusScreen>
  );
}

function UnderReviewScreen() {
  return (
    <StatusScreen
      title="Registration under review"
      description="Our admin team is currently reviewing your documents and lab details."
      badge="UNDER REVIEW"
      badgeClassName="bg-sky-100 text-sky-900 hover:bg-sky-100"
      footer={
        <p className="text-sm text-muted-foreground">
          You will be able to access the lab dashboard once approval is complete.
        </p>
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
        <Clock className="h-8 w-8 text-sky-700" />
      </div>
    </StatusScreen>
  );
}

function RejectedScreen({ reason }: { reason?: string }) {
  return (
    <StatusScreen
      title="Registration rejected"
      description="Your laboratory registration was not approved. Please review the reason and update your details."
      badge="REJECTED"
      badgeClassName="bg-red-100 text-red-900 hover:bg-red-100"
      footer={
        <div className="space-y-4 text-left text-sm">
          {reason ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <p className="font-medium text-foreground">Reason</p>
              <p className="mt-1 text-muted-foreground">{reason}</p>
            </div>
          ) : null}
          <Button asChild className="w-full">
            <Link href="/auth/register/lab-registration/">Update registration</Link>
          </Button>
        </div>
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-8 w-8 text-red-700" />
      </div>
    </StatusScreen>
  );
}

function SuspendedScreen({ status }: { status: string }) {
  return (
    <StatusScreen
      title="Lab account not active"
      description="Your laboratory account cannot access the dashboard right now. Please contact support."
      badge={status}
      badgeClassName="bg-slate-200 text-slate-900 hover:bg-slate-200"
      footer={
        <p className="text-sm text-muted-foreground">
          Need help? Reach out to DoctorProCare support with your registered mobile number.
        </p>
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
        <ShieldAlert className="h-8 w-8 text-slate-700" />
      </div>
    </StatusScreen>
  );
}

function IncompleteRegistrationScreen() {
  return (
    <StatusScreen
      title="Lab registration incomplete"
      description="Your account has the lab admin role, but no laboratory profile was found. Please complete registration to continue."
      badge="REGISTRATION INCOMPLETE"
      badgeClassName="bg-amber-100 text-amber-900 hover:bg-amber-100"
      footer={
        <Button asChild className="w-full">
          <Link href="/auth/register/lab-registration/">Complete lab registration</Link>
        </Button>
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <ShieldAlert className="h-8 w-8 text-amber-700" />
      </div>
    </StatusScreen>
  );
}

/**
 * Single gate for all /lab-dashboard/* routes.
 * Renders status screens until operational_access is true; only then shows children.
 */
export function LabOperationalGate({ children }: { children: ReactNode }) {
  const { data: session, isPending, isError, error } = useLabSession();

  if (isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    if (isLabProfileMissingError(error)) {
      return <IncompleteRegistrationScreen />;
    }
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionHasOperationalAccess(session)) {
    return <>{children}</>;
  }

  const status =
    session?.registration_status || session?.organization?.registration_status || "PENDING";
  const displayName = session?.organization?.display_name;
  const rejectionReason = session?.organization?.rejection_reason;

  if (status === "UNDER_REVIEW") {
    return <UnderReviewScreen />;
  }
  if (status === "REJECTED") {
    return <RejectedScreen reason={rejectionReason} />;
  }
  if (status === "SUSPENDED" || status === "BLOCKED" || status === "INACTIVE") {
    return <SuspendedScreen status={status} />;
  }

  return <PendingScreen displayName={displayName} />;
}
