import type { AppointmentCheckInResponse } from "@/lib/api/appointments";
import { postAppointmentCheckIn } from "@/lib/api/appointments";
import { toast } from "sonner";

export async function checkInHelpdeskAppointment(
  appointmentId: string,
): Promise<AppointmentCheckInResponse> {
  const res = await postAppointmentCheckIn(appointmentId);
  if (res.status >= 200 && res.status < 300) {
    return res.data as AppointmentCheckInResponse;
  }
  const raw = res.data as { all?: { code?: string; message?: string } } | undefined;
  const code = raw?.all?.code ?? "UNKNOWN_ERROR";
  const message = raw?.all?.message ?? "Something went wrong";
  const err = new Error(message);
  (err as { code?: string }).code = code;
  throw err;
}

export function toastCheckInError(err: unknown): void {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : "";
  if (code === "INVALID_STATUS") {
    toast.error("Cannot check-in this appointment");
  } else if (code === "NOT_FOUND") {
    toast.error("Appointment not found");
  } else if (code === "PERMISSION_DENIED") {
    toast.error("Not allowed");
  } else if (code === "CONFLICT") {
    toast.error(msg || "Conflict occurred");
  } else if (code === "QUEUE_ERROR") {
    toast.error("Failed to add patient to queue");
  } else {
    toast.error(msg || "Something went wrong");
  }
}

export function toastCheckInSuccess(message?: string): void {
  if (message?.toLowerCase().includes("already")) {
    toast.info("Already checked in — patient is in queue");
  } else {
    toast.success("Patient checked in and added to queue");
  }
}
