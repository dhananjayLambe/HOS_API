"use client";

import type { AppointmentKind, ConsultationMode } from "@/lib/helpdesk/helpdeskAppointmentTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface AppointmentDetailsFormProps {
  consultationMode: ConsultationMode;
  onConsultationModeChange: (v: ConsultationMode) => void;
  appointmentType: AppointmentKind;
  onAppointmentTypeChange: (v: AppointmentKind) => void;
  consultationFee: string;
  onConsultationFeeChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AppointmentDetailsForm({
  consultationMode,
  onConsultationModeChange,
  appointmentType,
  onAppointmentTypeChange,
  consultationFee,
  onConsultationFeeChange,
  notes,
  onNotesChange,
  disabled,
  className,
}: AppointmentDetailsFormProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm font-medium text-foreground">Details</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Consultation mode</Label>
          <Select
            value={consultationMode}
            onValueChange={(v) => onConsultationModeChange(v as ConsultationMode)}
            disabled={disabled}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clinic">Clinic</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Appointment type</Label>
          <Select
            value={appointmentType}
            onValueChange={(v) => onAppointmentTypeChange(v as AppointmentKind)}
            disabled={disabled}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="helpdesk-fee">Fee (₹)</Label>
        <Input
          id="helpdesk-fee"
          inputMode="decimal"
          className="h-11"
          value={consultationFee}
          onChange={(e) => onConsultationFeeChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="helpdesk-notes">Notes (optional)</Label>
        <Textarea
          id="helpdesk-notes"
          rows={2}
          className="resize-none"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
          placeholder="Short note for front desk…"
        />
      </div>
    </div>
  );
}
