"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CustomInvestigationType, InvestigationUrgencyLevel } from "@/lib/consultation-types";

export const CUSTOM_INVESTIGATION_TYPE_OPTIONS: { id: CustomInvestigationType; label: string }[] = [
  { id: "lab", label: "Lab Test" },
  { id: "radiology", label: "Radiology" },
  { id: "procedure", label: "Procedure" },
  { id: "other", label: "Other" },
];

export interface CustomInvestigationFormValues {
  name: string;
  custom_investigation_type: CustomInvestigationType;
  instructions: string;
  urgency: InvestigationUrgencyLevel;
}

const DEFAULT_VALUES: CustomInvestigationFormValues = {
  name: "",
  custom_investigation_type: "lab",
  instructions: "",
  urgency: "routine",
};

export interface CustomInvestigationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill name when opening (e.g. from search box). */
  initialName?: string;
  onSave: (values: CustomInvestigationFormValues) => void;
  /** When provided, blocks save and shows inline message instead of toast. */
  isDuplicateName?: (trimmedName: string) => boolean;
}

export function CustomInvestigationSheet({
  open,
  onOpenChange,
  initialName = "",
  onSave,
  isDuplicateName,
}: CustomInvestigationSheetProps) {
  const [values, setValues] = useState<CustomInvestigationFormValues>(DEFAULT_VALUES);
  const [nameError, setNameError] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({
      ...DEFAULT_VALUES,
      name: initialName.trim(),
    });
    setNameError(false);
    setDuplicateError(false);
  }, [open, initialName]);

  const handleSave = () => {
    const name = values.name.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    if (isDuplicateName?.(name)) {
      setDuplicateError(true);
      return;
    }
    setNameError(false);
    setDuplicateError(false);
    onSave({
      ...values,
      name,
      instructions: values.instructions.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Custom Investigation</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 pr-1">
          <div className="space-y-2">
            <Label htmlFor="custom-inv-name">
              Investigation name <span className="text-amber-600 dark:text-amber-400">*</span>
            </Label>
            <Input
              id="custom-inv-name"
              value={values.name}
              onChange={(e) => {
                setValues((v) => ({ ...v, name: e.target.value }));
                if (nameError && e.target.value.trim()) setNameError(false);
                if (duplicateError) setDuplicateError(false);
              }}
              placeholder="e.g. Serum Ferritin, X-ray Left Knee"
              className="rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-blue-500/30"
              aria-invalid={nameError}
              aria-describedby={nameError ? "custom-inv-name-error" : undefined}
            />
            {nameError && (
              <p id="custom-inv-name-error" className="text-sm text-amber-900 dark:text-amber-100">
                Name is required
              </p>
            )}
            {duplicateError && (
              <p className="text-sm text-amber-800 dark:text-amber-200" role="status">
                Already added — choose another name
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-inv-type">Type (optional)</Label>
            <Select
              value={values.custom_investigation_type}
              onValueChange={(v) =>
                setValues((prev) => ({
                  ...prev,
                  custom_investigation_type: v as CustomInvestigationType,
                }))
              }
            >
              <SelectTrigger id="custom-inv-type" className="rounded-lg border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_INVESTIGATION_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority (optional)</Label>
            <RadioGroup
              value={values.urgency}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, urgency: v as InvestigationUrgencyLevel }))
              }
              className="flex flex-wrap gap-4"
            >
              <label className="flex items-center gap-2">
                <RadioGroupItem value="routine" id="custom-inv-p-routine" />
                <span>Routine</span>
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="urgent" id="custom-inv-p-urgent" />
                <span>Urgent</span>
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="stat" id="custom-inv-p-stat" />
                <span>STAT</span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-inv-instructions">Instructions / notes (optional)</Label>
            <Textarea
              id="custom-inv-instructions"
              value={values.instructions}
              onChange={(e) => setValues((v) => ({ ...v, instructions: e.target.value }))}
              placeholder="e.g. Fasting required, morning sample…"
              className="min-h-[88px] resize-y rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
            onClick={handleSave}
          >
            Save &amp; Use
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
