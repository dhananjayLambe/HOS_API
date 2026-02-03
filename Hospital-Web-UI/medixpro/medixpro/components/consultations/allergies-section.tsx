"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Plus, FileText, ChevronDown, ChevronUp, Clock, Trash2 } from "lucide-react";
import { DynamicSectionForm } from "./dynamic-section-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToastNotification } from "@/hooks/use-toast-notification";

interface AllergiesSectionProps {
  data: any;
  previousRecords?: any[];
  onUpdate: (data: any) => void;
  quickMode?: boolean;
}

export function AllergiesSection({ data, previousRecords = [], onUpdate, quickMode = false }: AllergiesSectionProps) {
  const toast = useToastNotification();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates] = useState([
    { id: "drug_allergy", name: "Drug Allergy" },
    { id: "food_allergy", name: "Food Allergy" },
    { id: "no_allergies", name: "No Known Allergies" },
  ]);

  const hasData = data && Object.keys(data).length > 0;
  const hasHistory = previousRecords && previousRecords.length > 0;

  const handleDelete = () => {
    onUpdate(null);
    setShowDeleteDialog(false);
    toast.info("Allergies entry deleted.");
  };

  const handleSave = (formData: any) => {
    onUpdate(formData);
    setIsDialogOpen(false);
    toast.success("Allergies recorded successfully!");
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const templateData = getTemplateData(templateId);
    if (templateData) {
      onUpdate(templateData);
      setIsDialogOpen(false);
    }
  };

  const getTemplateData = (templateId: string) => {
    const templates: Record<string, any> = {
      drug_allergy: {
        drug_allergy: {
          drug_name: "Penicillin",
          reaction: "Rash",
        },
      },
      food_allergy: {
        food_allergy: {
          food_name: "Peanuts",
          reaction: "Anaphylaxis",
        },
      },
      no_allergies: {
        no_allergies: true,
      },
    };
    return templates[templateId] || null;
  };

  const getSummaryText = (allergiesData?: any) => {
    const dataToUse = allergiesData || data;
    if (!dataToUse || Object.keys(dataToUse).length === 0) return "No allergies recorded";
    if (dataToUse.no_allergies) return "No known allergies";
    const parts: string[] = [];
    if (dataToUse.drug_allergy) {
      parts.push(`Drug: ${dataToUse.drug_allergy.drug_name} (${dataToUse.drug_allergy.reaction})`);
    }
    if (dataToUse.food_allergy) {
      parts.push(`Food: ${dataToUse.food_allergy.food_name} (${dataToUse.food_allergy.reaction})`);
    }
    return parts.length > 0 ? parts.join(" • ") : "Allergies recorded";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Date unknown";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card className="relative hover:shadow-md transition-shadow border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Allergies
              <span className="text-xs text-red-600 font-normal">(Critical)</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Last Record Summary - Inline */}
            {hasHistory && previousRecords.length > 0 && (
              <div className="p-2.5 bg-muted/30 rounded-lg border text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Last: {formatDate(previousRecords[0].date)}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-1 font-medium">
                  {getSummaryText(previousRecords[0])}
                </p>
              </div>
            )}

            {/* Current/New Entry */}
            {hasData ? (
              <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default" className="text-xs bg-purple-600">
                    {hasHistory ? "Update Allergies" : "Record Allergies"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-sm text-foreground line-clamp-2">
                  {getSummaryText()}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.drug_allergy && (
                    <Badge variant="destructive" className="text-xs">
                      Drug Allergy
                    </Badge>
                  )}
                  {data.food_allergy && (
                    <Badge variant="destructive" className="text-xs">
                      Food Allergy
                    </Badge>
                  )}
                  {data.no_allergies && (
                    <Badge variant="success" className="text-xs">
                      No Allergies
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-8 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></span>
              </div>
            )}

            {/* Previous History - Collapsible for older records */}
            {hasHistory && previousRecords.length > 1 && (
              <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      View History ({previousRecords.length - 1})
                    </span>
                    {isHistoryOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    <div className="space-y-3 mt-2">
                      {previousRecords.slice(1).map((record, index) => (
                        <div
                          key={index}
                          className="p-3 bg-muted/50 rounded-lg border text-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(record.date)}
                            </span>
                          </div>
                          <Separator />
                          <p className="text-sm text-foreground">
                            {getSummaryText(record)}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {record.drug_allergy && (
                              <Badge variant="destructive" className="text-xs">
                                Drug Allergy
                              </Badge>
                            )}
                            {record.food_allergy && (
                              <Badge variant="destructive" className="text-xs">
                                Food Allergy
                              </Badge>
                            )}
                            {record.no_allergies && (
                              <Badge variant="success" className="text-xs">
                                No Allergies
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Primary Action Button */}
            <Button
              variant={hasData ? "outline" : "default"}
              className={`w-full gap-2 ${
                !hasData 
                  ? "bg-purple-500 hover:bg-purple-600 text-white shadow-sm hover:shadow-md transition-all" 
                  : "border-purple-500 text-purple-600 hover:bg-purple-50 hover:border-purple-600 dark:hover:bg-purple-950/20"
              }`}
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {hasData ? "Update Allergies" : "Record Allergies"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Allergies</DialogTitle>
            <DialogDescription className="text-xs">
              Record patient allergies and adverse reactions.
            </DialogDescription>
          </DialogHeader>
          <DynamicSectionForm
            sectionCode="allergies"
            initialData={data}
            onSave={handleSave}
            onCancel={() => setIsDialogOpen(false)}
            saveButtonText="Save Allergies"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allergies Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this new allergies entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
