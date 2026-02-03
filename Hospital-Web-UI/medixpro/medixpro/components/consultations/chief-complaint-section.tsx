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
import { FileText, Plus, FileText as TemplateIcon, ChevronDown, ChevronUp, Clock, Trash2 } from "lucide-react";
import { DynamicSectionForm } from "./dynamic-section-form";
import { usePreConsultationTemplateStore } from "@/store/preConsultationTemplateStore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToastNotification } from "@/hooks/use-toast-notification";

interface ChiefComplaintSectionProps {
  data: any;
  previousRecords?: any[];
  onUpdate: (data: any) => void;
  quickMode?: boolean;
}

export function ChiefComplaintSection({ data, previousRecords = [], onUpdate, quickMode = false }: ChiefComplaintSectionProps) {
  const toast = useToastNotification();
  const { template } = usePreConsultationTemplateStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates] = useState([
    { id: "fever", name: "Fever & Cold" },
    { id: "pain", name: "Pain Complaint" },
    { id: "digestive", name: "Digestive Issues" },
  ]);

  // Check for data in both legacy format (data.complaint) and new format (data.primary_complaint.complaint_text)
  const hasData = data && (
    data.complaint || 
    (data.primary_complaint && data.primary_complaint.complaint_text) ||
    Object.keys(data).length > 0
  );
  const hasHistory = previousRecords && previousRecords.length > 0;
  
  // Get complaint text for display (current data)
  const getComplaintText = () => {
    if (!data) return "";
    if (typeof data.complaint === "string") return data.complaint; // Legacy format
    if (data.primary_complaint?.complaint_text) return data.primary_complaint.complaint_text; // Template format
    if (typeof data.primary_complaint === "object" && data.primary_complaint?.complaint_text) return data.primary_complaint.complaint_text;
    return "";
  };

  // Format duration for display: "1 Hours" → "1 hour", "2 Days" → "2 days"
  const formatDurationDisplay = (value: number, unit: string): string => {
    const u = (unit || "").trim().toLowerCase();
    const singular: Record<string, string> = {
      hours: "hour", hour: "hour", hrs: "hour", hr: "hour",
      days: "day", day: "day",
      weeks: "week", week: "week", wks: "week", wk: "week",
      months: "month", month: "month", mos: "month", mo: "month",
      years: "year", year: "year", yrs: "year", yr: "year",
    };
    const base = (singular[u] ?? u) || "unit";
    const label = value === 1 ? base : base + (base.endsWith("s") ? "" : "s");
    return `${value} ${label}`;
  };

  // Get display string from a record (current data or previous record). Shows actual complaint text + duration, like Vitals/History show actual data.
  const getComplaintDisplayText = (record: any): string => {
    if (record == null) return "—";
    if (typeof record === "string") return record || "—";
    if (typeof record.complaint === "string") return record.complaint;
    const pc = record.primary_complaint;
    let text =
      (pc && typeof pc === "object" && pc.complaint_text != null)
        ? String(pc.complaint_text).trim()
        : (record.complaint_text != null ? String(record.complaint_text).trim() : "");
    if (!text && record.additional_notes?.notes) text = String(record.additional_notes.notes).trim();
    if (!text && typeof record.notes === "string") text = record.notes.trim();
    let dur: string | null = null;
    if (record.duration != null && typeof record.duration === "object" && record.duration.duration_value != null && record.duration.duration_unit) {
      const val = Number(record.duration.duration_value);
      const unit = record.duration.duration_unit;
      dur = Number.isFinite(val) ? formatDurationDisplay(val, unit) : `${record.duration.duration_value} ${record.duration.duration_unit}`;
    } else if (record.duration != null && typeof record.duration !== "object") {
      dur = String(record.duration);
    }
    if (text) return dur ? `${text} (${dur})` : text;
    if (dur) return dur;
    return "—";
  };

  const handleDelete = () => {
    onUpdate(null);
    setShowDeleteDialog(false);
    toast.info("Chief complaint entry deleted.");
  };

  const handleSave = (formData: any) => {
    onUpdate(formData);
    setIsDialogOpen(false);
    toast.success("Chief complaint recorded successfully!");
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
      fever: {
        complaint: "Fever with cold and cough for 3 days",
      },
      pain: {
        complaint: "Severe headache and body pain",
      },
      digestive: {
        complaint: "Stomach pain and nausea",
      },
    };
    return templates[templateId] || null;
  };

  return (
    <>
      <Card className="relative hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-orange-600" />
              Chief Complaint
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <TemplateIcon className="h-3 w-3 mr-1" />
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
                <p className="text-xs text-foreground mt-1 font-medium line-clamp-2">
                  {getComplaintDisplayText(previousRecords[0].complaint ?? previousRecords[0])}
                </p>
              </div>
            )}

            {/* Current/New Entry */}
            {hasData ? (
              <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default" className="text-xs bg-purple-600">
                    {hasHistory ? "Update Complaint" : "Record Complaint"}
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
                <p className="text-sm text-foreground line-clamp-3">
                  {getComplaintText()}
                </p>
                <Badge variant="outline" className="text-xs mt-2">
                  Recorded
                </Badge>
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
                          <p className="text-sm text-foreground line-clamp-3">
                            {getComplaintDisplayText(record.complaint ?? record)}
                          </p>
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
              {hasData ? "Update Complaint" : "Record Complaint"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg">Chief Complaint</DialogTitle>
            <DialogDescription className="text-xs">
              Record the primary reason for the patient's visit.
            </DialogDescription>
          </DialogHeader>
          <DynamicSectionForm
            sectionCode="chief_complaint"
            initialData={data}
            onSave={handleSave}
            onCancel={() => setIsDialogOpen(false)}
            saveButtonText="Save Complaint"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this new complaint entry? This action cannot be undone.
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
