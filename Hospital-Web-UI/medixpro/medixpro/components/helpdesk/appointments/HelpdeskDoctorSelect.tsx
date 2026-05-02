"use client";

import type { MockDoctor } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface HelpdeskDoctorSelectProps {
  doctors: MockDoctor[];
  /** Use undefined when none selected so the placeholder shows (Radix Select). */
  value: string | undefined;
  onValueChange: (doctorId: string) => void;
  disabled?: boolean;
  /** Helpdesk clinic doctors are loading from context API. */
  loading?: boolean;
  className?: string;
}

export function HelpdeskDoctorSelect({
  doctors,
  value,
  onValueChange,
  disabled,
  loading,
  className,
}: HelpdeskDoctorSelectProps) {
  const busy = Boolean(disabled || loading);
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="helpdesk-doctor">Doctor</Label>
      <Select value={value} onValueChange={onValueChange} disabled={busy}>
        <SelectTrigger id="helpdesk-doctor" className="h-11 w-full">
          <SelectValue placeholder={loading ? "Loading doctors…" : "Select doctor"} />
        </SelectTrigger>
        <SelectContent>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              <span className="font-medium">{d.name}</span>
              {d.specialization ? (
                <span className="text-muted-foreground"> — {d.specialization}</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
