"use client";

import { Pill, Plus, Trash2 } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConsultationStore } from "@/store/consultationStore";

const FREQUENCY_OPTIONS = ["Once daily", "Twice daily", "Thrice daily", "Every 4 hours", "As needed"];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "2 weeks", "1 month"];

export function MedicinesSection() {
  const { medicines, addMedicine, updateMedicine, removeMedicine } = useConsultationStore();

  return (
    <ConsultationSectionCard title="Medicines" icon={<Pill className="text-muted-foreground" />}>
      <div className="space-y-2">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      value={row.name}
                      onChange={(e) => updateMedicine(row.id, { name: e.target.value })}
                      placeholder="Name"
                      className="h-9 border-0 bg-transparent focus-visible:ring-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.dose}
                      onChange={(e) => updateMedicine(row.id, { dose: e.target.value })}
                      placeholder="Dose"
                      className="h-9 border-0 bg-transparent focus-visible:ring-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.frequency || ""}
                      onValueChange={(v) => updateMedicine(row.id, { frequency: v })}
                    >
                      <SelectTrigger className="h-9 border-0 bg-transparent shadow-none">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.duration || ""}
                      onValueChange={(v) => updateMedicine(row.id, { duration: v })}
                    >
                      <SelectTrigger className="h-9 border-0 bg-transparent shadow-none">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.notes}
                      onChange={(e) => updateMedicine(row.id, { notes: e.target.value })}
                      placeholder="Notes"
                      className="h-9 border-0 bg-transparent focus-visible:ring-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeMedicine(row.id)}
                      aria-label="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            addMedicine({
              name: "",
              dose: "",
              frequency: "",
              duration: "",
              notes: "",
            })
          }
          className="gap-1.5 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
      </div>
    </ConsultationSectionCard>
  );
}
