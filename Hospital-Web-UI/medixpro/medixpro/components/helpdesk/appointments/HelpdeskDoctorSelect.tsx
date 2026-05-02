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
  value: string;
  onValueChange: (doctorId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function HelpdeskDoctorSelect({
  doctors,
  value,
  onValueChange,
  disabled,
  className,
}: HelpdeskDoctorSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="helpdesk-doctor">Doctor</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id="helpdesk-doctor" className="h-11 w-full">
          <SelectValue placeholder="Select doctor" />
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
