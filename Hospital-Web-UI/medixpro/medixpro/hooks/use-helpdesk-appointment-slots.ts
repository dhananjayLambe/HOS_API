"use client";

import { useCallback, useState } from "react";

import type { FetchSlotsParams, Slot } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import {
  generateMockSlots,
  mockDelay,
  MOCK_DOCTOR_UNAVAILABLE_ID,
} from "@/lib/helpdesk/helpdeskAppointmentMockStore";

export function useHelpdeskAppointmentSlots() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const fetchSlots = useCallback(async (params: FetchSlotsParams) => {
    const { doctorId, date } = params;
    if (!doctorId || !date) {
      setSlots([]);
      setSlotsError(null);
      return;
    }
    setIsLoadingSlots(true);
    setSlotsError(null);
    setSlots([]);
    try {
      await mockDelay(500, 1000);
      if (doctorId === MOCK_DOCTOR_UNAVAILABLE_ID) {
        setSlotsError("Doctor is unavailable for this date (mock).");
        setSlots([]);
        return;
      }
      if (Math.random() < 0.04) {
        setSlotsError("Unable to load slots. Try again (mock intermittent error).");
        setSlots([]);
        return;
      }
      setSlots(generateMockSlots(doctorId, date));
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  return {
    slots,
    fetchSlots,
    isLoadingSlots,
    slotsError,
  };
}
