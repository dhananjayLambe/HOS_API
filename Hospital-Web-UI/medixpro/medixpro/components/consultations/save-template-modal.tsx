"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { buildEndConsultationPayload } from "@/lib/consultation-payload-builder";
import { parseClinicalTemplateApiError } from "@/lib/clinical-template-api-errors";
import {
  cleanTemplatePayload,
  hasTemplateClinicalContent,
} from "@/lib/clean-template-payload";
import { createClinicalTemplate } from "@/services/clinical-template.service";
import { useConsultationStore } from "@/store/consultationStore";

export interface SaveTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function SaveTemplateModal({ open, onOpenChange, onSaved }: SaveTemplateModalProps) {
  const toast = useToastNotification();
  const consultationType = useConsultationStore((s) => s.consultationType ?? "FULL");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTemplateName("");
      setLoading(false);
    }
  }, [open]);

  const handleSave = async () => {
    const name = templateName.trim();
    if (!name) return;

    const store = useConsultationStore.getState();
    const payload = buildEndConsultationPayload(store);
    const template_data = cleanTemplatePayload(payload);

    if (!hasTemplateClinicalContent(template_data)) {
      toast.error("Nothing to save as template");
      return;
    }

    setLoading(true);
    try {
      await createClinicalTemplate({
        name,
        consultation_type: consultationType,
        template_data,
      });
      toast.success(`Template "${name}" saved`);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(parseClinicalTemplateApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const canSave = templateName.trim().length > 0 && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Save Template</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="save-template-name">Name</Label>
          <Input
            id="save-template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Hypertension Adult"
            autoFocus
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSave) {
                e.preventDefault();
                void handleSave();
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={!canSave} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
