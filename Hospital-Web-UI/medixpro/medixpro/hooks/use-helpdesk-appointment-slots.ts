"use client";

import { addMinutes, format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { getAppointmentSlots, type AppointmentSlotsEnvelope } from "@/lib/api/appointments";
import { SLOT_LEAD_BUFFER_MINUTES } from "@/lib/helpdesk/bookingCalendarLimits";
import type { Slot, SlotState } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { MOCK_DOCTOR_UNAVAILABLE_ID } from "@/lib/helpdesk/helpdeskAppointmentMockStore";

/** API returns HH:mm:ss; grid uses HH:mm labels (parseable by slotTimeBuckets). */
function toHhMm(hms: string): string {
  const parts = hms.trim().split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return hms;
}

function mapRowToSlot(
  row: { start_time: string; end_time: string; status: string },
  idKey: string
): Slot {
  const raw = row.status;
  const state: SlotState =
    raw === "available" || raw === "booked" || raw === "blocked" ? raw : "available";
  return {
    id: `${idKey}|${row.start_time}|${row.end_time}`,
    startTime: toHhMm(row.start_time),
    endTime: toHhMm(row.end_time),
    state,
  };
}

function isSuccessStatus(s: unknown): boolean {
  return typeof s === "string" && s.trim().toLowerCase() === "success";
}

function localTodayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function slotStartLocalDate(dateIso: string, startTimeHhMm: string): Date {
  const [y, mo, d] = dateIso.split("-").map(Number);
  const [hh, mm] = startTimeHhMm.split(":").map(Number);
  return new Date(y, mo - 1, d, hh, mm, 0, 0);
}

function filterPastSlotsForToday(slots: Slot[], dateIso: string): Slot[] {
  if (dateIso !== localTodayIso()) return slots;
  const cutoff = addMinutes(new Date(), SLOT_LEAD_BUFFER_MINUTES);
  return slots.filter((s) => slotStartLocalDate(dateIso, s.startTime) > cutoff);
}

function readMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const m = (body as Record<string, unknown>).message;
  return typeof m === "string" && m.trim() ? m.trim() : null;
}

export function useHelpdeskAppointmentSlots({
  doctorId,
  clinicId,
  date,
}: {
  doctorId: string;
  clinicId: string;
  date: string;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  /** When API succeeds but returns zero slots, show backend explanation in the grid. */
  const [slotsEmptyHint, setSlotsEmptyHint] = useState<string | null>(null);

  const fetchSlots = useCallback(
    async (signal: AbortSignal) => {
      setSlotsEmptyHint(null);
      if (!doctorId || !clinicId?.trim() || !date) {
        setSlots([]);
        setSlotsError(null);
        setIsLoadingSlots(false);
        return;
      }

      if (doctorId === MOCK_DOCTOR_UNAVAILABLE_ID) {
        setSlots([]);
        setSlotsError("Doctor is unavailable for this date (mock).");
        setIsLoadingSlots(false);
        return;
      }

      setIsLoadingSlots(true);
      setSlotsError(null);

      try {
        const res = await getAppointmentSlots(
          {
            doctor_id: doctorId,
            clinic_id: clinicId.trim(),
            date,
          },
          { signal }
        );

        if (signal.aborted) return;

        const httpStatus = res.status;
        const body = res.data as unknown;

        if (httpStatus < 200 || httpStatus >= 300) {
          const msg =
            readMessage(body) ||
            (typeof body === "object" && body && "detail" in (body as object)
              ? String((body as { detail?: unknown }).detail)
              : null) ||
            `Could not load slots (${httpStatus})`;
          toast.error(msg);
          setSlots([]);
          return;
        }

        const envelope = body as AppointmentSlotsEnvelope;
        if (!isSuccessStatus(envelope.status)) {
          toast.error(readMessage(envelope) || "Failed to load slots");
          setSlots([]);
          return;
        }

        const inner = envelope.data;
        if (!inner || typeof inner !== "object") {
          toast.error(readMessage(envelope) || "Invalid slots response");
          setSlots([]);
          return;
        }

        const rows = (inner as { slots?: unknown }).slots;
        if (!Array.isArray(rows)) {
          toast.error(readMessage(envelope) || "Invalid slots response");
          setSlots([]);
          return;
        }

        const idKey = `${doctorId}|${clinicId.trim()}|${date}`;
        const mapped: Slot[] = [];
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const r = row as Record<string, unknown>;
          if (typeof r.start_time !== "string" || typeof r.end_time !== "string") continue;
          mapped.push(
            mapRowToSlot(
              {
                start_time: r.start_time,
                end_time: r.end_time,
                status: typeof r.status === "string" ? r.status : "available",
              },
              idKey
            )
          );
        }
        const beforeUiFilter = mapped.length;
        const filtered = filterPastSlotsForToday(mapped, date);
        setSlots(filtered);
        if (filtered.length === 0) {
          const isToday = date === localTodayIso();
          if (isToday && beforeUiFilter > 0) {
            setSlotsEmptyHint("No slots available for today.");
          } else {
            setSlotsEmptyHint(
              readMessage(envelope) || "No time windows for this doctor on this date."
            );
          }
        } else {
          setSlotsEmptyHint(null);
        }
      } catch (e) {
        if (signal.aborted) return;
        if (isAxiosError(e) && (e.code === "ERR_CANCELED" || e.message === "canceled")) return;
        const fromBody =
          isAxiosError(e) && e.response?.data
            ? readMessage(e.response.data) ||
              (typeof e.response.data === "object" &&
              e.response.data &&
              "detail" in e.response.data
                ? String((e.response.data as { detail?: unknown }).detail)
                : null)
            : null;
        toast.error(fromBody || "Failed to load slots");
        setSlots([]);
      } finally {
        if (!signal.aborted) {
          setIsLoadingSlots(false);
        }
      }
    },
    [doctorId, clinicId, date]
  );

  useEffect(() => {
    const ac = new AbortController();
    void fetchSlots(ac.signal);
    return () => ac.abort();
  }, [fetchSlots]);

  const refetch = useCallback(() => {
    const ac = new AbortController();
    return fetchSlots(ac.signal);
  }, [fetchSlots]);

  return {
    slots,
    isLoadingSlots,
    slotsError,
    slotsEmptyHint,
    refetch,
  };
}
