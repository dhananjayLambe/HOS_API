"use client";

import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PrescriptionWhatsAppDelivery } from "@/components/prescriptions/types";

export type WhatsAppDeliveryCardProps = {
  delivery?: PrescriptionWhatsAppDelivery | null;
  loading?: boolean;
  /** True when polling finished but no whatsapp status was returned from the API. */
  statusTimedOut?: boolean;
  retrying?: boolean;
  resending?: boolean;
  onRetry?: () => void;
  onResend?: () => void;
  onRefreshStatus?: () => void;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  read: "bg-emerald-600 text-white",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-slate-200 text-slate-700",
};

function formatTimestamp(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, "dd MMM yyyy, hh:mm a");
  } catch {
    return value;
  }
}

export function getWhatsAppFailureGuidance(
  status?: string | null,
  failureReason?: string | null,
  recipientMobile?: string | null
): string | null {
  const normalizedStatus = (status || "").toLowerCase();
  const reason = (failureReason || "").trim();

  if (normalizedStatus === "skipped") {
    if (reason === "No mobile number") {
      return "Add the patient's mobile number to their profile, then use Resend below.";
    }
    if (reason === "Invalid mobile number") {
      return "Update the patient's mobile to a valid 10-digit number, then use Resend below.";
    }
    if (reason === "PDF not available") {
      return "Prescription PDF was not ready. Use Resend to try again.";
    }
    if (reason) {
      return reason;
    }
    return "WhatsApp delivery was skipped.";
  }

  if (normalizedStatus === "failed") {
    if (reason.toLowerCase().includes("authentication") || reason.includes("190")) {
      return "Meta WhatsApp token rejected (error 190). Update WHATSAPP_ACCESS_TOKEN in .env, then restart Django and Celery (Celery keeps the old token until restarted). Retry after both are up.";
    }
    if (reason.includes("131030") || reason.toLowerCase().includes("not in allowed list")) {
      const numberHint = recipientMobile
        ? `Add ${recipientMobile} (digits only, no +)`
        : "Add the patient's number as full international digits (e.g. 919730789922, no +)";
      return `Recipient is not on your Meta app's test allow-list, or the number format does not match. ${numberHint} in Meta Developer Console → WhatsApp → API Setup → test recipients, then Retry.`;
    }
    if (reason.includes("132000") || reason.toLowerCase().includes("number of parameters")) {
      return "Meta template parameter count mismatch (error 132000). consultant_utlity expects 4 body variables: patient, doctor, medicines, tests. Ensure WHATSAPP_TEMPLATE_BODY_PARAM_KEYS=patient_name,doctor_name,medicine_block,test_block in .env, then restart Celery and Retry.";
    }
    if (reason.includes("132018") || reason.toLowerCase().includes("parameters in your template")) {
      return "Meta rejected template variables (error 132018). Variables cannot contain line breaks; medicines/tests are sent as single lines. Retry after restarting Celery, or shorten medicine/test text if the message is very long.";
    }
    if (reason.includes("132001") || reason.toLowerCase().includes("template name does not exist")) {
      return "Meta rejected the WhatsApp template. Set WHATSAPP_PRESCRIPTION_TEMPLATE_NAME=consultant_utlity and WHATSAPP_TEMPLATE_LANGUAGE_CODE=en in .env to match your approved Meta template, then restart Django and Celery and Retry.";
    }
    return reason || "Delivery failed. Use Retry to queue another attempt.";
  }

  return null;
}

export function WhatsAppDeliveryCard({
  delivery,
  loading = false,
  statusTimedOut = false,
  retrying = false,
  resending = false,
  onRetry,
  onResend,
  onRefreshStatus,
  className,
}: WhatsAppDeliveryCardProps) {
  if (loading) {
    return (
      <div className={cn("rounded-xl border border-border/70 bg-white p-4 shadow-sm", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking WhatsApp delivery status…
        </div>
      </div>
    );
  }

  if (!delivery?.status) {
    if (statusTimedOut) {
      return (
        <div className={cn("rounded-xl border border-amber-200 bg-amber-50 p-4", className)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">WhatsApp status not loaded</p>
                <p>
                  Delivery may still be processing (ensure Celery is running), or no delivery was queued yet.
                  Click <strong>Queue Delivery</strong> below, or Refresh Status. Tests-only consultations
                  do not create a prescription record — WhatsApp is sent from the consultation summary.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onRefreshStatus ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  disabled={retrying || resending}
                  onClick={() => void onRefreshStatus()}
                >
                  Refresh Status
                </Button>
              ) : null}
              {onResend ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  disabled={retrying || resending}
                  onClick={() => void onResend()}
                >
                  {resending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Queue Delivery
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4", className)}>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>WhatsApp delivery is being prepared. Status will appear here shortly.</p>
        </div>
      </div>
    );
  }

  const status = (delivery.status || "").toLowerCase();
  const guidance = getWhatsAppFailureGuidance(
    status,
    delivery.failure_reason,
    delivery.recipient_mobile_number
  );

  return (
    <div className={cn("rounded-xl border border-border/70 bg-white p-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">WhatsApp Delivery</p>
          <Badge className={cn("mt-2 capitalize", STATUS_STYLES[status] || "bg-muted text-foreground")}>
            {status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {delivery.can_retry && onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={retrying || resending}
              onClick={() => void onRetry()}
            >
              {retrying ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Retry Delivery
            </Button>
          ) : null}
          {delivery.can_resend && onResend ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={retrying || resending}
              onClick={() => void onResend()}
            >
              {resending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Resend
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {delivery.sent_at ? <p>Sent: {formatTimestamp(delivery.sent_at)}</p> : null}
        {delivery.delivered_at ? <p>Delivered: {formatTimestamp(delivery.delivered_at)}</p> : null}
        {delivery.read_at ? <p>Read: {formatTimestamp(delivery.read_at)}</p> : null}
        {guidance ? (
          <p className={status === "failed" ? "text-red-700" : "text-slate-700"}>{guidance}</p>
        ) : null}
      </div>
    </div>
  );
}
