"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchPhlebotomists, type PhlebotomistListItem } from "@/lib/labs/api/home-collections";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (phlebotomistId: string) => void;
  loading?: boolean;
};

export function AssignPhlebotomistDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const [phlebotomists, setPhlebotomists] = useState<PhlebotomistListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setLoadError(null);
    void fetchPhlebotomists()
      .then(setPhlebotomists)
      .catch(() => setLoadError("Could not load phlebotomists."));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign phlebotomist</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Phlebotomist</Label>
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          <Select value={selectedId} onValueChange={setSelectedId} disabled={loading || !!loadError}>
            <SelectTrigger>
              <SelectValue placeholder="Select phlebotomist" />
            </SelectTrigger>
            <SelectContent>
              {phlebotomists.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedId || loading}
            onClick={() => onConfirm(selectedId)}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
