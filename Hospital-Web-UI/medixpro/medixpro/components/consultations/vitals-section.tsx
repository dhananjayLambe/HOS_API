"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Activity, Plus, FileText, ChevronDown, ChevronUp, Clock, Trash2 } from "lucide-react";
import { DynamicSectionForm } from "./dynamic-section-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToastNotification } from "@/hooks/use-toast-notification";

interface VitalsSectionProps {
  data: any;
  previousRecords?: any[];
  onUpdate: (data: any) => void;
  quickMode?: boolean;
}

export function VitalsSection({ data, previousRecords = [], onUpdate, quickMode = false }: VitalsSectionProps) {
  const toast = useToastNotification();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates] = useState([
    { id: "normal_adult", name: "Normal Adult Vitals" },
    { id: "hypertension", name: "Hypertension Check" },
    { id: "fever", name: "Fever Assessment" },
  ]);

  const hasData = data && Object.keys(data).length > 0;
  const hasHistory = previousRecords && previousRecords.length > 0;

  const handleDelete = () => {
    onUpdate(null);
    setShowDeleteDialog(false);
    toast.info("Vitals entry deleted.");
  };

  const handleSave = (formData: any) => {
    try {
      onUpdate(formData ?? {});
      setIsDialogOpen(false);
      toast.success("Vitals recorded successfully!");
    } catch (err: any) {
      const message = err?.message || err?.toString?.() || "Failed to save vitals.";
      toast.error(message);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    // Load template data
    const templateData = getTemplateData(templateId);
    if (templateData) {
      onUpdate(templateData);
      setIsDialogOpen(false);
    }
  };

  const getTemplateData = (templateId: string) => {
    // This would typically come from an API
    const templates: Record<string, any> = {
      normal_adult: {
        height_weight: { height_cm: 170, weight_kg: 70 },
        blood_pressure: { systolic: 120, diastolic: 80 },
        temperature: { value: 98.6 },
      },
      hypertension: {
        blood_pressure: { systolic: 140, diastolic: 90 },
      },
      fever: {
        temperature: { value: 101.2 },
      },
    };
    return templates[templateId] || null;
  };

  const getSummaryText = (vitalsData?: any) => {
    const dataToUse = vitalsData || data;
    if (!dataToUse || Object.keys(dataToUse).length === 0) return "No vitals recorded";
    const parts: string[] = [];
    if (dataToUse.blood_pressure) {
      const sys = dataToUse.blood_pressure.systolic;
      const dia = dataToUse.blood_pressure.diastolic;
      if (sys != null && dia != null) parts.push(`BP: ${sys}/${dia}`);
    }
    if (dataToUse.temperature) {
      const temp = dataToUse.temperature.temperature ?? dataToUse.temperature.value;
      if (temp != null) parts.push(`Temp: ${temp}°C`);
    }
    if (dataToUse.height_weight) {
      const ht = dataToUse.height_weight.height ?? dataToUse.height_weight.height_cm;
      const wt = dataToUse.height_weight.weight ?? dataToUse.height_weight.weight_kg;
      if (ht != null || wt != null) {
        const segs: string[] = [];
        if (ht != null) segs.push(`Ht: ${ht}cm`);
        if (wt != null) segs.push(`Wt: ${wt}kg`);
        parts.push(segs.join(", "));
      }
      const bmi = dataToUse.height_weight.bmi;
      if (bmi != null && typeof bmi === "number") parts.push(`BMI: ${bmi.toFixed(1)}`);
    }
    return parts.length > 0 ? parts.join(" • ") : "Vitals recorded";
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
      <Card className="relative hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-purple-600" />
              Vitals
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
                    {hasHistory ? "Update Vitals" : "Record Vitals"}
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
                  {data.blood_pressure && (
                    <Badge variant="outline" className="text-xs">
                      BP
                    </Badge>
                  )}
                  {data.temperature && (
                    <Badge variant="outline" className="text-xs">
                      Temp
                    </Badge>
                  )}
                  {data.height_weight && (
                    <Badge variant="outline" className="text-xs">
                      Ht/Wt
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
                            {record.blood_pressure && (
                              <Badge variant="outline" className="text-xs">
                                BP
                              </Badge>
                            )}
                            {record.temperature && (
                              <Badge variant="outline" className="text-xs">
                                Temp
                              </Badge>
                            )}
                            {record.height_weight && (
                              <Badge variant="outline" className="text-xs">
                                Ht/Wt
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
              {hasData ? "Update Vitals" : "Record Vitals"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Record Vitals</DialogTitle>
            <DialogDescription className="text-xs">
              All fields are optional
            </DialogDescription>
          </DialogHeader>
          <DynamicSectionForm
            sectionCode="vitals"
            initialData={data}
            onSave={handleSave}
            onCancel={() => setIsDialogOpen(false)}
            saveButtonText="Save Vitals"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vitals Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this new vitals entry? This action cannot be undone.
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
