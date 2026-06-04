"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { REUPLOAD_REASON_OPTIONS } from "@/lib/labs/reports/upload/reupload-config";
import { cn } from "@/lib/utils";

export type ReuploadReasonFieldProps = {
  choice: string;
  otherText: string;
  onChoiceChange: (value: string) => void;
  onOtherTextChange: (value: string) => void;
  idPrefix?: string;
};

export function ReuploadReasonField({
  choice,
  otherText,
  onChoiceChange,
  onOtherTextChange,
  idPrefix = "reupload",
}: ReuploadReasonFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-[#374151]">
        Reason for re-upload <span className="text-red-600">*</span>
      </Label>
      <RadioGroup
        value={choice}
        onValueChange={(value) => {
          onChoiceChange(value);
          if (value !== "Other") onOtherTextChange("");
        }}
        className="grid gap-1.5 sm:grid-cols-2"
      >
        {REUPLOAD_REASON_OPTIONS.map((reason) => (
          <label
            key={reason}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
              choice === reason
                ? "border-[#7C5CFC] bg-[#F4F1FF]"
                : "border-[#E5E7EB] bg-white",
            )}
          >
            <RadioGroupItem
              value={reason}
              id={`${idPrefix}-reason-${reason.replace(/\W+/g, "-").toLowerCase()}`}
            />
            <span className="font-medium">{reason}</span>
          </label>
        ))}
      </RadioGroup>
      {choice === "Other" ? (
        <textarea
          id={`${idPrefix}-reason-other`}
          value={otherText}
          onChange={(event) => onOtherTextChange(event.target.value)}
          placeholder="Enter reason"
          className="min-h-16 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
        />
      ) : null}
      <p className="text-[10px] text-[#6B7280]">
        Select a reason so repeated re-uploads stay controlled.
      </p>
    </div>
  );
}
