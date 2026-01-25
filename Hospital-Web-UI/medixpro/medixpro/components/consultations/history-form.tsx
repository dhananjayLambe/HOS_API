"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

interface HistoryFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const MEDICAL_CONDITIONS = ["Diabetes", "Hypertension", "Thyroid"];

export function HistoryForm({ initialData, onSave, onCancel }: HistoryFormProps) {
  const [formData, setFormData] = useState({
    medical_history: {
      conditions: initialData?.medical_history?.conditions || [],
    },
    surgical_history: {
      procedure: initialData?.surgical_history?.procedure || "",
      year: initialData?.surgical_history?.year || "",
    },
    obstetric_history: {
      gravida: initialData?.obstetric_history?.gravida || "",
      para: initialData?.obstetric_history?.para || "",
    },
  });

  const handleConditionToggle = (condition: string) => {
    setFormData(prev => {
      const conditions = prev.medical_history.conditions;
      const newConditions = conditions.includes(condition)
        ? conditions.filter((c: string) => c !== condition)
        : [...conditions, condition];
      return {
        ...prev,
        medical_history: {
          ...prev.medical_history,
          conditions: newConditions,
        },
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData: any = {};

    if (formData.medical_history.conditions.length > 0) {
      cleanedData.medical_history = {
        conditions: formData.medical_history.conditions,
      };
    }

    if (formData.surgical_history.procedure) {
      cleanedData.surgical_history = {
        procedure: formData.surgical_history.procedure,
        year: formData.surgical_history.year ? Number(formData.surgical_history.year) : undefined,
      };
    }

    if (formData.obstetric_history.gravida || formData.obstetric_history.para) {
      cleanedData.obstetric_history = {
        gravida: formData.obstetric_history.gravida ? Number(formData.obstetric_history.gravida) : undefined,
        para: formData.obstetric_history.para ? Number(formData.obstetric_history.para) : undefined,
      };
    }

    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Compact Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Medical History - Checkboxes */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Medical Conditions</Label>
          <div className="space-y-1.5">
            {MEDICAL_CONDITIONS.map((condition) => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox
                  id={condition}
                  checked={formData.medical_history.conditions.includes(condition)}
                  onCheckedChange={() => handleConditionToggle(condition)}
                  className="h-4 w-4"
                />
                <Label
                  htmlFor={condition}
                  className="text-xs font-normal cursor-pointer"
                >
                  {condition}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Surgical History */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Surgical History</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="procedure" className="text-xs">Procedure</Label>
              <Input
                id="procedure"
                type="text"
                placeholder="Appendectomy"
                value={formData.surgical_history.procedure}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    surgical_history: {
                      ...prev.surgical_history,
                      procedure: e.target.value,
                    },
                  }))
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="year" className="text-xs">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="2015"
                value={formData.surgical_history.year}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    surgical_history: {
                      ...prev.surgical_history,
                      year: e.target.value,
                    },
                  }))
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Obstetric History */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-semibold">Obstetric History</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="gravida" className="text-xs">Gravida</Label>
              <Input
                id="gravida"
                type="number"
                placeholder="2"
                value={formData.obstetric_history.gravida}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    obstetric_history: {
                      ...prev.obstetric_history,
                      gravida: e.target.value,
                    },
                  }))
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="para" className="text-xs">Para</Label>
              <Input
                id="para"
                type="number"
                placeholder="1"
                value={formData.obstetric_history.para}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    obstetric_history: {
                      ...prev.obstetric_history,
                      para: e.target.value,
                    },
                  }))
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 h-9 text-sm">
          Save History
        </Button>
      </div>
    </form>
  );
}
