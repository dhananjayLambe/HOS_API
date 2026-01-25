"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChiefComplaintFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function ChiefComplaintForm({ initialData, onSave, onCancel }: ChiefComplaintFormProps) {
  const [complaint, setComplaint] = useState(initialData?.complaint || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (complaint.trim()) {
      onSave({ complaint: complaint.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="complaint" className="text-xs font-semibold">Chief Complaint</Label>
        <Textarea
          id="complaint"
          placeholder="Enter the primary reason for the patient's visit..."
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          rows={5}
          className="resize-none text-sm min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          Describe the main reason for the consultation.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 h-9 text-sm" disabled={!complaint.trim()}>
          Save Complaint
        </Button>
      </div>
    </form>
  );
}
