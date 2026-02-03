"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatient } from "@/lib/patientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, CheckCircle2 } from "lucide-react";
import axiosClient from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useMobile } from "@/hooks/use-mobile";
import { usePreConsultationTemplateStore } from "@/store/preConsultationTemplateStore";
import { DynamicSectionRenderer } from "@/components/consultations/dynamic-section-renderer";
import { PreviousRecordsView } from "@/components/consultations/previous-records-view";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Helper to build API URLs without double slashes
function buildApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api/";
  // Remove trailing slash from baseUrl and leading slash from path, then join
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

export function DynamicPreConsultation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedPatient } = usePatient();
  const toast = useToastNotification();
  const isMobile = useMobile();

  const encounterId = searchParams.get("encounter_id");
  const [currentEncounterId] = useState<string | null>(encounterId);

  const { template, isLoading: isLoadingTemplate, error: templateError, fetchTemplate, isSectionEnabled } =
    usePreConsultationTemplateStore();

  // Flat normalized state: { [sectionCode]: { [itemCode]: { [fieldKey]: value } } }
  const [sectionData, setSectionData] = useState<Record<string, Record<string, any>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [previousRecords, setPreviousRecords] = useState<any[]>([]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSavesRef = useRef<Set<string>>(new Set());
  const debouncedSectionData = useDebounce(sectionData, 1500);

  useEffect(() => {
    if (!template) fetchTemplate();
  }, [template, fetchTemplate]);

  useEffect(() => {
    if (!selectedPatient?.id) return;
    (async () => {
      try {
        const response = await axiosClient.get(
          buildApiUrl(`consultations/pre-consult/patient/${selectedPatient.id}/previous-records/`)
        );
        if (response.data?.data) setPreviousRecords(response.data.data);
      } catch {
        // non-blocking
      }
    })();
  }, [selectedPatient]);

  useEffect(() => {
    if (!currentEncounterId || !template) return;
    (async () => {
      setIsLoadingData(true);
      const loadedData: Record<string, Record<string, any>> = {};

      for (const section of template.template.sections) {
        if (!isSectionEnabled(section.section)) continue;
        try {
          const response = await axiosClient.get(
            buildApiUrl(`consultations/pre-consult/encounter/${currentEncounterId}/section/${section.section}/`)
          );
          if (response.data?.data) loadedData[section.section] = response.data.data;
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            // non-blocking
          }
        }
      }

      setSectionData(loadedData);
      setIsLoadingData(false);
    })();
  }, [currentEncounterId, template, isSectionEnabled]);

  const autosaveSections = useCallback(async () => {
    if (!currentEncounterId || !template || pendingSavesRef.current.size === 0) return;

    const sectionsToSave = Array.from(pendingSavesRef.current);
    pendingSavesRef.current.clear();

    for (const sectionCode of sectionsToSave) {
      if (!sectionData[sectionCode]) continue;
      try {
        await axiosClient.post(
          buildApiUrl(`consultations/pre-consult/encounter/${currentEncounterId}/section/${sectionCode}/`),
          { data: sectionData[sectionCode] }
        );
      } catch {
        // non-blocking
      }
    }

    setLastSaved(new Date());
  }, [currentEncounterId, template, sectionData]);

  useEffect(() => {
    if (!currentEncounterId || !template) return;
    if (Object.keys(debouncedSectionData).length === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => void autosaveSections(), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [debouncedSectionData, currentEncounterId, template, autosaveSections]);

  const handleSectionDataChange = useCallback(
    (sectionCode: string, itemCode: string, fieldKey: string, value: any) => {
      setSectionData((prev) => {
        const next = { ...prev };
        next[sectionCode] = next[sectionCode] ? { ...next[sectionCode] } : {};
        next[sectionCode][itemCode] = next[sectionCode][itemCode]
          ? { ...next[sectionCode][itemCode] }
          : {};
        next[sectionCode][itemCode][fieldKey] = value;
        pendingSavesRef.current.add(sectionCode);
        return next;
      });
    },
    []
  );

  const handleManualSave = useCallback(async () => {
    if (!currentEncounterId || !template) {
      toast.error("Encounter ID or template missing");
      return;
    }

    setIsSaving(true);
    try {
      const savePromises = template.template.sections
        .filter((s) => isSectionEnabled(s.section) && sectionData[s.section])
        .map((s) =>
          axiosClient.post(
            buildApiUrl(`consultations/pre-consult/encounter/${currentEncounterId}/section/${s.section}/`),
            { data: sectionData[s.section] }
          )
        );
      await Promise.all(savePromises);
      setLastSaved(new Date());
      pendingSavesRef.current.clear();
      toast.success("Pre-consultation saved");
    } catch {
      toast.error("Failed to save pre-consultation");
    } finally {
      setIsSaving(false);
    }
  }, [currentEncounterId, template, sectionData, isSectionEnabled, toast]);

  const enabledSections = useMemo(() => {
    if (!template) return [];
    return template.template.sections.filter((s) => isSectionEnabled(s.section));
  }, [template, isSectionEnabled]);

  if (!selectedPatient) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please select a patient first</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingTemplate) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading template...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (templateError || !template) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{templateError || "Failed to load template"}</p>
            <Button onClick={() => fetchTemplate()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pre-Consultation</h1>
            <p className="text-sm text-muted-foreground">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
          <Button onClick={handleManualSave} disabled={isSaving || isLoadingData} className="min-w-[120px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {previousRecords.length > 0 && (
        <div className="mb-6">
          <PreviousRecordsView records={previousRecords} />
        </div>
      )}

      {isLoadingData ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading data...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {enabledSections.map((section) => (
            <DynamicSectionRenderer
              key={section.section}
              section={section}
              sectionData={sectionData[section.section] || {}}
              onSectionDataChange={(itemCode, fieldKey, value) =>
                handleSectionDataChange(section.section, itemCode, fieldKey, value)
              }
              isMobile={isMobile}
            />
          ))}
          {enabledSections.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No sections enabled for this specialty</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
          <Button onClick={handleManualSave} disabled={isSaving || isLoadingData} className="w-full" size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

