"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface AllergiesFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const DRUG_REACTIONS = ["Rash", "Breathing difficulty", "Anaphylaxis"];
const FOOD_REACTIONS = ["Vomiting", "Rash", "Breathing difficulty"];

export function AllergiesForm({ initialData, onSave, onCancel }: AllergiesFormProps) {
  const [formData, setFormData] = useState({
    no_allergies: initialData?.no_allergies || false,
    drug_allergy: {
      drug_name: initialData?.drug_allergy?.drug_name || "",
      reaction: initialData?.drug_allergy?.reaction || "",
    },
    food_allergy: {
      food_name: initialData?.food_allergy?.food_name || "",
      reaction: initialData?.food_allergy?.reaction || "",
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData: any = {};

    if (formData.no_allergies) {
      cleanedData.no_allergies = true;
    } else {
      if (formData.drug_allergy.drug_name) {
        cleanedData.drug_allergy = {
          drug_name: formData.drug_allergy.drug_name,
          reaction: formData.drug_allergy.reaction || undefined,
        };
      }

      if (formData.food_allergy.food_name) {
        cleanedData.food_allergy = {
          food_name: formData.food_allergy.food_name,
          reaction: formData.food_allergy.reaction || undefined,
        };
      }
    }

    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* No Allergies Checkbox */}
      <div className="flex items-center space-x-2 pb-2">
        <Checkbox
          id="no_allergies"
          checked={formData.no_allergies}
          onCheckedChange={(checked) =>
            setFormData(prev => ({
              ...prev,
              no_allergies: checked as boolean,
            }))
          }
          className="h-4 w-4"
        />
        <Label htmlFor="no_allergies" className="text-xs font-normal cursor-pointer">
          No known allergies
        </Label>
      </div>

      {!formData.no_allergies && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
          {/* Drug Allergy */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Drug Allergy</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="drug_name" className="text-xs">Drug Name</Label>
                <Input
                  id="drug_name"
                  type="text"
                  placeholder="Penicillin"
                  value={formData.drug_allergy.drug_name}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      drug_allergy: {
                        ...prev.drug_allergy,
                        drug_name: e.target.value,
                      },
                    }))
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="drug_reaction" className="text-xs">Reaction</Label>
                <Select
                  value={formData.drug_allergy.reaction}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      drug_allergy: {
                        ...prev.drug_allergy,
                        reaction: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select reaction" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRUG_REACTIONS.map((reaction) => (
                      <SelectItem key={reaction} value={reaction}>
                        {reaction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Food Allergy */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Food Allergy</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="food_name" className="text-xs">Food Name</Label>
                <Input
                  id="food_name"
                  type="text"
                  placeholder="Peanuts"
                  value={formData.food_allergy.food_name}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      food_allergy: {
                        ...prev.food_allergy,
                        food_name: e.target.value,
                      },
                    }))
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="food_reaction" className="text-xs">Reaction</Label>
                <Select
                  value={formData.food_allergy.reaction}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      food_allergy: {
                        ...prev.food_allergy,
                        reaction: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select reaction" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_REACTIONS.map((reaction) => (
                      <SelectItem key={reaction} value={reaction}>
                        {reaction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 text-sm">
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 h-9 text-sm">
          Save Allergies
        </Button>
      </div>
    </form>
  );
}
