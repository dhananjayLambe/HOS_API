"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  CheckCircle,
  Copy,
  Eye,
  FileText,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Search,
  Star,
  Stethoscope,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsultationStore } from "@/store/consultationStore";
import { usePatient } from "@/lib/patientContext";
import { backendAxiosClient } from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConsultationWorkflowType } from "@/lib/consultation-types";
import { isSectionVisible } from "@/lib/consultation-workflow";
import { applyClinicalTemplate } from "@/lib/apply-clinical-template";
import { parseClinicalTemplateApiError } from "@/lib/clinical-template-api-errors";
import {
  getClinicalTemplates,
  type ClinicalTemplateListItem,
} from "@/services/clinical-template.service";
import { ViewPreDrawer } from "./view-pre-drawer";
import { ConsultationAutosaveIndicator } from "./consultation-autosave-indicator";
import { buildEndConsultationPayload } from "@/lib/consultation-payload-builder";
import {
  formatEndConsultationErrorToast,
  getFirstSectionErrorKey,
  validateConsultationForEnd,
} from "@/lib/consultation-end-validation";
import { isEncounterInstructionIncomplete } from "@/lib/instruction-completion";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { EXPAND_FOLLOW_UP_SIDEBAR_EVENT } from "@/components/consultations/sections/follow-up-section";
import {
  EndConsultationReviewData,
  EndConsultationReviewModal,
} from "./EndConsultationReviewModal";
import { SaveTemplateModal } from "./save-template-modal";

const CONSULTATION_TYPE_LABELS: Record<ConsultationWorkflowType, string> = {
  FULL: "Full Consultation",
  QUICK_RX: "Quick Prescription",
  TEST_ONLY: "Test Only Visit",
};

const TEMPLATE_TYPE_SHORT: Record<string, string> = {
  FULL: "Full",
  QUICK_RX: "Quick",
  TEST_ONLY: "Test",
};

/** After applying a template: expand these when visible; scroll/activate only the first visible (diagnosis → medicines → investigations). */
const APPLY_TEMPLATE_SECTION_PRIORITY = [
  "diagnosis",
  "medicines",
  "investigations",
] as const;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function isFollowUpSet(store: ReturnType<typeof useConsultationStore.getState>): boolean {
  const { follow_up_date, follow_up_interval } = store;
  const interval = follow_up_interval ?? 0;
  return !!(follow_up_date?.trim() || interval > 0);
}

function calculateAgeFromDob(dateOfBirth?: string): string {
  if (!dateOfBirth) return "-";
  try {
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return "-";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age >= 0 ? String(age) : "-";
  } catch {
    return "-";
  }
}

function formatPatientGender(gender?: string): string {
  const raw = (gender ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("m")) return "M";
  if (raw.startsWith("f")) return "F";
  return raw.charAt(0).toUpperCase();
}

function formatFollowUpReviewText(store: ReturnType<typeof useConsultationStore.getState>): string {
  if (store.follow_up_date?.trim()) {
    const rawDate = store.follow_up_date.trim();
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      const formatted = parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return `Follow-up: ${formatted}`;
    }
    return `Follow-up: ${rawDate}`;
  }
  const interval = Number(store.follow_up_interval ?? 0);
  if (interval > 0) {
    const unit = store.follow_up_unit === "weeks" ? "week" : "day";
    return `Follow-up in ${interval} ${unit}${interval === 1 ? "" : "s"}`;
  }
  return "As advised";
}

function splitLegacyLines(value?: string): string[] {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractDoseDisplayFromMedicine(raw: any): string {
  const explicitDoseDisplay = String(raw?.dose_display ?? "").trim();
  if (explicitDoseDisplay) return explicitDoseDisplay;

  const doseUnitId = String(raw?.dose_unit_id ?? "").trim().toLowerCase();
  const doseUnitLabel = String(raw?.dose_unit_label ?? raw?.dose_unit ?? "").trim().toLowerCase();
  const doseUnitMap: Record<string, string> = {
    tab: "tablet",
    tablet: "tablet",
    cap: "capsule",
    capsule: "capsule",
    ml: "ml",
    mg: "mg",
    gm: "gm",
    drop: "drop",
    drops: "drops",
    puff: "puff",
    puffs: "puffs",
    spray: "spray",
    patch: "patch",
    suppository: "suppository",
    inhaler: "inhaler",
    nebulizer: "nebulizer",
    powder: "powder",
    other: "apply",
    topical: "apply",
    apply: "apply",
  };
  const resolvedDoseUnit =
    doseUnitMap[doseUnitId] ||
    doseUnitMap[doseUnitLabel] ||
    (doseUnitLabel ? doseUnitLabel : "");

  const frequencyId = String(raw?.frequency_id ?? "").trim();
  const patternText = String(raw?.frequency_custom_text ?? "").trim();
  const durationText = String(raw?.duration_display ?? "").trim();
  const doseCustomText = String(raw?.dose_custom_text ?? "").trim();
  const doseValue = raw?.dose_value;
  const doseValueText =
    doseValue === undefined || doseValue === null || Number.isNaN(Number(doseValue))
      ? ""
      : String(doseValue).trim();

  if (doseValueText && resolvedDoseUnit) {
    const patternSuffix = patternText ? ` (${patternText})` : "";
    return `${doseValueText} ${resolvedDoseUnit}${patternSuffix}`.trim();
  }

  // Keep this strictly from already stored values; prefer explicit pattern format like "1-0-1".
  if (patternText) return patternText;
  if (frequencyId) return frequencyId;
  if (durationText) return durationText;
  if (doseCustomText) return doseCustomText;
  if (doseValueText) return doseValueText;
  return "";
}

function extractDurationDisplayFromMedicine(raw: any): string {
  const explicitDurationDisplay = String(raw?.duration_display ?? "").trim();
  if (explicitDurationDisplay) return explicitDurationDisplay;

  const durationSpecial = String(raw?.duration_special ?? "").trim().toLowerCase();
  if (durationSpecial === "sos") return "SOS";
  if (durationSpecial === "till_required") return "Till required";
  if (durationSpecial === "continue") return "Continue";
  if (durationSpecial === "stat") return "STAT";

  const rawDurationValue = Number(raw?.duration_value ?? 0);
  if (Number.isFinite(rawDurationValue) && rawDurationValue > 0) {
    const durationValue = Math.floor(rawDurationValue);
    const durationUnit = String(raw?.duration_unit ?? "days").trim().toLowerCase();
    if (durationUnit === "weeks") return `${durationValue} week${durationValue === 1 ? "" : "s"}`;
    if (durationUnit === "months") return `${durationValue} month${durationValue === 1 ? "" : "s"}`;
    return `${durationValue} day${durationValue === 1 ? "" : "s"}`;
  }

  return "";
}

export function ConsultationActionBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();
  /** useToastNotification() returns a new object each render; keep a stable ref for effects. */
  const toastErrorRef = useRef(toast.error);
  toastErrorRef.current = toast.error;
  const { selectedPatient } = usePatient();
  const { activateSection, scrollSectionIntoView, expandSectionCard } =
    useConsultationSectionScroll();
  const {
    consultationType,
    setConsultationType,
    encounterId: storeEncounterId,
    setSelectedDetail,
    setSelectedSymptomId,
    setSectionValidationErrors,
    setSectionValidationSoftWarnings,
    clearSectionValidationUi,
  } =
    useConsultationStore();
  const encounterIdFromUrl = searchParams.get("encounter_id");
  const encounterId = storeEncounterId || encounterIdFromUrl;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);
  const [showEndConsultationConfirm, setShowEndConsultationConfirm] = useState(false);
  const [showStartNewVisitConfirm, setShowStartNewVisitConfirm] = useState(false);
  const [showViewPre, setShowViewPre] = useState(false);
  const [isEndingConsultation, setIsEndingConsultation] = useState(false);
  const [isStartingNewVisit, setIsStartingNewVisit] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [endConsultationReviewData, setEndConsultationReviewData] = useState<EndConsultationReviewData | null>(null);
  const [visitPnr, setVisitPnr] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isFinalizationOverlayVisible, setIsFinalizationOverlayVisible] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templatesPopoverOpen, setTemplatesPopoverOpen] = useState(false);
  const [templatesMobileOpen, setTemplatesMobileOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const debouncedTemplateSearch = useDebouncedValue(templateSearch, 300);
  const [clinicalTemplates, setClinicalTemplates] = useState<ClinicalTemplateListItem[]>([]);
  const [clinicalTemplatesLoading, setClinicalTemplatesLoading] = useState(false);
  const [clinicalTemplatesError, setClinicalTemplatesError] = useState<string | null>(null);
  const [templatesRefetchNonce, setTemplatesRefetchNonce] = useState(0);
  const templateSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch visit_pnr when encounterId is available
  useEffect(() => {
    if (!encounterId) {
      setVisitPnr(null);
      setConsultationId(null);
      return;
    }
    let cancelled = false;
    backendAxiosClient
      .get<{ visit_pnr?: string; consultation_id?: string | null }>(`/consultations/encounter/${encounterId}/`)
      .then((res) => {
        if (cancelled) return;
        setVisitPnr(res.data?.visit_pnr ?? null);
        setConsultationId(res.data?.consultation_id ?? null);
      })
      .catch(() => {
        setVisitPnr(null);
        setConsultationId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  const copyPnrToClipboard = () => {
    if (!visitPnr) return;
    navigator.clipboard.writeText(visitPnr).then(() => {
      toast.success("Visit PNR copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy PNR");
    });
  };

  const templatesPickerOpen = templatesPopoverOpen || templatesMobileOpen;

  /** Only API loading drives the blocking spinner; debounce lag must not (see toast dep fix below). */
  const templatesListBusy = clinicalTemplatesLoading;

  useEffect(() => {
    if (!templatesPickerOpen) {
      setTemplateSearch("");
      setClinicalTemplatesError(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      templateSearchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [templatesPickerOpen]);

  useEffect(() => {
    if (!templatesPickerOpen) return;
    let cancelled = false;
    setClinicalTemplatesLoading(true);
    setClinicalTemplatesError(null);
    const q = debouncedTemplateSearch.trim();
    getClinicalTemplates({
      type: consultationType || "FULL",
      search: q || undefined,
    })
      .then((res) => {
        if (!cancelled) setClinicalTemplates(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err: unknown) => {
        const message = parseClinicalTemplateApiError(err);
        if (!cancelled) {
          setClinicalTemplates([]);
          setClinicalTemplatesError(message);
        }
        toastErrorRef.current(message);
      })
      .finally(() => {
        if (!cancelled) setClinicalTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    templatesPickerOpen,
    debouncedTemplateSearch,
    consultationType,
    templatesRefetchNonce,
  ]);

  const handleApplyClinicalTemplate = useCallback(
    (t: ClinicalTemplateListItem) => {
      const result = applyClinicalTemplate(t);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.applied) return;
      if (result.typeMismatch) {
        toast.warning(
          `Template is for ${t.consultation_type}, current is ${consultationType ?? "FULL"}`
        );
      }
      toast.success(`Template "${t.name}" applied`);
      const wf = (consultationType || "FULL") as ConsultationWorkflowType;
      for (const section of APPLY_TEMPLATE_SECTION_PRIORITY) {
        if (isSectionVisible(wf, section)) {
          expandSectionCard(section);
        }
      }
      const scrollTarget = APPLY_TEMPLATE_SECTION_PRIORITY.find((section) =>
        isSectionVisible(wf, section)
      );
      if (scrollTarget) {
        scrollSectionIntoView(scrollTarget);
        activateSection(scrollTarget);
      }
      setTemplatesPopoverOpen(false);
      setTemplatesMobileOpen(false);
    },
    [
      activateSection,
      consultationType,
      expandSectionCard,
      scrollSectionIntoView,
      toast,
    ]
  );

  const renderTemplatesPickerList = () => {
    const hasSearch = debouncedTemplateSearch.trim().length > 0;

    return (
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={templateSearchInputRef}
            placeholder="Search templates..."
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            className="h-9 pl-8"
            aria-label="Search templates"
            autoFocus={templatesPickerOpen}
          />
        </div>
        <div className="max-h-[min(360px,50vh)] overflow-y-auto rounded-md border border-border/60">
          {templatesListBusy ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span>Loading templates…</span>
            </div>
          ) : clinicalTemplatesError ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
              <p className="text-sm text-foreground">{clinicalTemplatesError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplatesRefetchNonce((n) => n + 1)}
              >
                Try again
              </Button>
            </div>
          ) : clinicalTemplates.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {hasSearch ? (
                <>
                  <p>No templates found</p>
                  <p className="mt-1 text-xs">Try a different search</p>
                </>
              ) : (
                <>
                  <p>No saved templates for this consultation type</p>
                  <p className="mt-1 text-xs">Use &quot;Save template&quot; on the toolbar to create one</p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border/60 p-1">
              {clinicalTemplates.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2.5 text-left text-sm hover:bg-muted/80"
                    onClick={() => handleApplyClinicalTemplate(item)}
                  >
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {TEMPLATE_TYPE_SHORT[item.consultation_type] ?? item.consultation_type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // Intercept browser back so the same "Unsaved changes" dialog appears; on confirm, same as Cancel (reset + dashboard)
  useEffect(() => {
    const stateKey = "consultation-unsaved";
    if (typeof window === "undefined") return;
    window.history.pushState({ [stateKey]: true }, "");
    const onPopState = (e: PopStateEvent) => {
      window.history.pushState({ [stateKey]: true }, "");
      setShowCancelConfirm(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isFinalizationOverlayVisible) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isFinalizationOverlayVisible]);

  useEffect(() => {
    if (!showEndConsultationConfirm) {
      setEndConsultationReviewData(null);
      return;
    }
    const store = useConsultationStore.getState();
    const diagnosisItems = store.sectionItems.diagnosis ?? [];
    const medicineItems = store.sectionItems.medicines ?? [];
    const investigationItems = store.sectionItems.investigations ?? [];
    const legacyMeds = Array.isArray(store.medicines)
      ? store.medicines.map((m: any) => ({
          name: String(m?.name ?? "").trim() || "Unnamed medicine",
          dose_display: extractDoseDisplayFromMedicine(m),
          duration_display: extractDurationDisplayFromMedicine(m),
          instructions: String(m?.instructions ?? m?.notes ?? "").trim() || undefined,
        }))
      : [];
    const medicinesFromSections = medicineItems.map((item: any) => ({
      name: String(item?.label ?? item?.name ?? "").trim() || "Unnamed medicine",
      dose_display: extractDoseDisplayFromMedicine(item?.detail?.medicine),
      duration_display: extractDurationDisplayFromMedicine(item?.detail?.medicine),
      instructions: String(item?.detail?.medicine?.instructions ?? item?.detail?.notes ?? "").trim() || undefined,
    }));
    const medicines = medicinesFromSections.length > 0 ? medicinesFromSections : legacyMeds;
    const diagnosis = diagnosisItems.length > 0
      ? diagnosisItems
          .map((item: any) => String(item?.label ?? item?.name ?? "").trim())
          .filter(Boolean)
      : splitLegacyLines(store.diagnosis);
    const tests = investigationItems.length > 0
      ? investigationItems
          .map((item: any) => String(item?.label ?? item?.name ?? "").trim())
          .filter(Boolean)
      : splitLegacyLines(store.investigations);
    const patient = selectedPatient as (typeof selectedPatient & { age?: string | number }) | null;
    const directAge = patient?.age;
    const age =
      (directAge !== undefined && directAge !== null && String(directAge).trim()) ||
      calculateAgeFromDob(patient?.date_of_birth);
    const reviewData: EndConsultationReviewData = {
      patient: {
        name: patient?.full_name || `${patient?.first_name ?? ""} ${patient?.last_name ?? ""}`.trim() || "Unknown patient",
        age: String(age || "-"),
        gender: formatPatientGender(patient?.gender) || "-",
      },
      vitals: {
        bp: (store.vitals as Record<string, unknown>)?.bp as string | undefined,
        pulse: (store.vitals as Record<string, unknown>)?.pulse as string | undefined,
        temp: store.vitals?.temperatureF,
        weight: store.vitals?.weightKg,
        height: store.vitals?.heightCm,
      },
      diagnosis,
      medicines,
      tests,
      follow_up: formatFollowUpReviewText(store),
    };
    setEndConsultationReviewData(reviewData);
  }, [showEndConsultationConfirm, selectedPatient]);

  const handleTypeChange = (nextType: ConsultationWorkflowType) => {
    if (nextType !== consultationType) {
      setConsultationType(nextType);
    }
  };

  const downloadPrescriptionPdf = async (
    consultationIdForPdf: string,
    payload: ReturnType<typeof buildEndConsultationPayload>,
    targetWindow: Window
  ) => {
    const token = window.localStorage.getItem("access_token");
    const response = await fetch(`/api/consultations/${consultationIdForPdf}/summary-lite/pdf/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let detail = "PDF generation failed";
      try {
        const errPayload = await response.json();
        detail = errPayload?.detail || detail;
      } catch {}
      throw new Error(detail);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = targetWindow.document.createElement("a");
    link.href = url;
    link.download = `prescription-${consultationIdForPdf}.pdf`;
    targetWindow.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const renderCompletedPreviewAndRedirect = async (
    previewTab: Window,
    payload: ReturnType<typeof buildEndConsultationPayload>
  ) => {
    if (consultationId) {
      const previewRes = await backendAxiosClient.post<{ html?: string }>(
        `/consultations/${consultationId}/summary-lite/html/`,
        payload
      );
      const html = (previewRes.data?.html || "").trim();
      if (html) {
        openPreviewWindow(html, previewTab, consultationId, payload);
      } else {
        previewTab.close();
        toast.error("Failed to load prescription preview.");
      }
    } else {
      previewTab.close();
    }
    toast.success("Consultation completed successfully");
    setTimeout(() => {
      useConsultationStore.getState().reset();
      router.replace("/doctor-dashboard");
    }, 0);
  };

  const handleEndConsultation = async () => {
    if (isEndingConsultation) {
      return;
    }
    const id = encounterId;
    if (!id) {
      toast.error("Encounter not found. Refresh the page or go back to the consultation.");
      return;
    }
    const preStore = useConsultationStore.getState();
    if (
      preStore.instructionsList.some((row) =>
        isEncounterInstructionIncomplete(row, preStore.getInstructionTemplateByKeyOrId)
      )
    ) {
      expandSectionCard("instructions");
      scrollSectionIntoView("instructions");
      activateSection("instructions");
      toast.warning("Please complete all instruction details before ending consultation");
      return;
    }

    const storeSnapshot = useConsultationStore.getState();
    const payload = buildEndConsultationPayload(storeSnapshot);
    clearSectionValidationUi();
    const { errors, warnings } = validateConsultationForEnd(
      storeSnapshot,
      payload,
      storeSnapshot.consultationType
    );
    if (Object.keys(errors).length > 0) {
      setSectionValidationErrors(errors);
      setSectionValidationSoftWarnings({});
      const first = getFirstSectionErrorKey(errors);
      if (first) {
        expandSectionCard(first);
        scrollSectionIntoView(first);
        activateSection(first);
      }
      toast.warning(formatEndConsultationErrorToast(errors));
      return;
    }
    setSectionValidationErrors({});
    setSectionValidationSoftWarnings(
      warnings.vitals ? { vitals: warnings.vitals } : {}
    );
    if (warnings.vitals) {
      toast.warning(warnings.vitals);
    }

    const previewTab = window.open("", "_blank");
    if (!previewTab) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }
    previewTab.document.title = "Preparing prescription preview...";
    previewTab.document.body.innerHTML =
      "<div style='font-family: Arial, sans-serif; padding: 24px; color: #374151;'>Preparing prescription preview...</div>";

    setIsEndingConsultation(true);
    setIsFinalizationOverlayVisible(true);
    try {
      const store = useConsultationStore.getState();
      const payloadForPost = buildEndConsultationPayload(store);
      await backendAxiosClient.post<{ redirect_url?: string; status?: string }>(
        `/consultations/encounter/${id}/consultation/complete/`,
        payloadForPost
      );
      clearSectionValidationUi();
      setShowEndConsultationConfirm(false);
      await renderCompletedPreviewAndRedirect(previewTab, payloadForPost);
    } catch (err: any) {
      const responseData = err?.response?.data;
      const rawErrors = responseData?.errors;
      const errorsText =
        rawErrors && typeof rawErrors === "object" && !Array.isArray(rawErrors)
          ? Object.entries(rawErrors as Record<string, string[]>)
              .flatMap(([k, msgs]) =>
                Array.isArray(msgs) ? msgs.map((m) => `${k}: ${m}`) : [`${k}: ${String(msgs)}`]
              )
              .join(" · ")
          : "";
      const message = String(responseData?.message || responseData?.detail || err?.message || "");
      const alreadyCompleted =
        message.toLowerCase().includes("consultation_completed") ||
        message.toLowerCase().includes("current: consultation_completed");
      if (alreadyCompleted) {
        try {
          setShowEndConsultationConfirm(false);
          const payload = buildEndConsultationPayload(useConsultationStore.getState());
          await renderCompletedPreviewAndRedirect(previewTab, payload);
          return;
        } catch {
          // continue to generic failure handling
        }
      }

      toast.error(
        errorsText
          ? `Validation: ${errorsText}`
          : "Failed to finalize consultation. Please try again."
      );
      if (!previewTab.closed) previewTab.close();
    } finally {
      setIsEndingConsultation(false);
      setIsFinalizationOverlayVisible(false);
    }
  };

  const handleStartNewVisit = async () => {
    if (!selectedPatient?.id) {
      toast.error("Select a patient first.");
      return;
    }
    setIsStartingNewVisit(true);
    try {
      const res = await backendAxiosClient.post<{ redirect_url?: string }>(
        "/consultations/entry/start-new-visit/",
        { patient_profile_id: selectedPatient.id }
      );
      const url = res.data?.redirect_url || "/consultations/pre-consultation";
      useConsultationStore.getState().reset();
      router.push(url);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to start new visit.";
      toast.error(msg);
    } finally {
      setIsStartingNewVisit(false);
      setShowStartNewVisitConfirm(false);
    }
  };

  const openPreviewWindow = (
    html: string,
    targetWindow?: Window | null,
    consultationIdForPdf?: string | null,
    draftPayload?: ReturnType<typeof buildEndConsultationPayload>
  ) => {
    const newWindow = targetWindow ?? window.open("", "_blank");
    if (!newWindow) {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();

    // Inject floating print/download controls in preview tab.
    const printStyle = newWindow.document.createElement("style");
    printStyle.textContent = "@media print { .rx-preview-action-btn { display: none !important; } }";
    newWindow.document.head.appendChild(printStyle);

    const actionWrap = newWindow.document.createElement("div");
    actionWrap.style.position = "fixed";
    actionWrap.style.top = "12px";
    actionWrap.style.right = "12px";
    actionWrap.style.zIndex = "2147483647";
    actionWrap.style.display = "flex";
    actionWrap.style.gap = "8px";

    const applyButtonStyles = (button: HTMLButtonElement) => {
      button.style.padding = "8px 12px";
      button.style.border = "1px solid #d1d5db";
      button.style.borderRadius = "8px";
      button.style.background = "#ffffff";
      button.style.color = "#111827";
      button.style.fontFamily = "Arial, Helvetica, sans-serif";
      button.style.fontSize = "12px";
      button.style.fontWeight = "600";
      button.style.cursor = "pointer";
      button.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.12)";
    };

    const printButton = newWindow.document.createElement("button");
    printButton.className = "rx-preview-action-btn";
    printButton.type = "button";
    printButton.textContent = "🖨 Print";
    printButton.setAttribute("aria-label", "Print prescription");
    applyButtonStyles(printButton);
    printButton.onclick = () => {
      newWindow.focus();
      newWindow.print();
    };

    const downloadButton = newWindow.document.createElement("button");
    downloadButton.className = "rx-preview-action-btn";
    downloadButton.type = "button";
    downloadButton.textContent = "⬇ Download PDF";
    downloadButton.setAttribute("aria-label", "Download prescription PDF");
    applyButtonStyles(downloadButton);
    downloadButton.onclick = async () => {
      if (!consultationIdForPdf || !draftPayload) {
        toast.error("Consultation not ready for PDF download.");
        return;
      }
      try {
        await downloadPrescriptionPdf(consultationIdForPdf, draftPayload, newWindow);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to download PDF.";
        toast.error(message);
      }
    };

    actionWrap.appendChild(printButton);
    actionWrap.appendChild(downloadButton);
    newWindow.document.body.appendChild(actionWrap);
  };

  const handlePreview = async () => {
    if (isPreviewLoading) return;
    if (!encounterId) {
      toast.error("Encounter not found. Refresh and try again.");
      return;
    }
    if (!consultationId) {
      toast.error("Consultation not ready for preview.");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const store = useConsultationStore.getState();
      const draftPayload = buildEndConsultationPayload(store);
      const res = await backendAxiosClient.post<{ html?: string }>(
        `/consultations/${consultationId}/summary-lite/html/`,
        draftPayload
      );
      const html = (res.data?.html || "").trim();
      if (!html) {
        toast.error("Failed to load prescription preview.");
        return;
      }
      openPreviewWindow(html, undefined, consultationId, draftPayload);
    } catch (error: any) {
      toast.error("Failed to load preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex h-12 min-h-12 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[#eee] bg-white px-3 sm:px-4 md:px-5 shadow-sm dark:border-border dark:bg-background">
        <div className="flex shrink-0 items-center gap-2 md:gap-3 min-h-0">
          <Button
            variant="outline"
            size="sm"
            aria-label="Back to appointments"
            onClick={() => setShowCancelConfirm(true)}
            disabled={isFinalizationOverlayVisible}
            className="gap-1.5 h-8 shrink-0 rounded-lg border-border/80 bg-muted/60 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted hover:border-muted-foreground/30 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Back</span>
          </Button>
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight sm:text-base truncate min-w-0">
            <Stethoscope className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
            <span className="hidden sm:inline">Consultation</span>
            <span className="sm:hidden">Consultation</span>
          </span>
          {encounterId && (
            <div className="flex items-center gap-3 shrink-0 min-w-0">
              <div className="flex items-center shrink-0" aria-live="polite">
                <ConsultationAutosaveIndicator />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1">
              <span className="text-xs font-medium text-muted-foreground">PNR:</span>
              <span className="text-xs font-mono text-foreground truncate max-w-[140px] sm:max-w-[200px]" title={visitPnr ?? undefined}>
                {visitPnr ?? "…"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 rounded"
                onClick={copyPnrToClipboard}
                disabled={!visitPnr}
                aria-label="Copy visit PNR"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 shrink items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_button]:shrink-0">
          {/* Consultation type dropdown (before Templates) */}
          <div className="shrink-0">
            <Select
              value={consultationType || "FULL"}
              onValueChange={(v) => handleTypeChange(v as ConsultationWorkflowType)}
            >
              <SelectTrigger
                className="w-[200px] min-h-[40px] rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700 text-sm font-semibold text-foreground shadow-sm transition-colors focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:border-violet-400 dark:focus:border-violet-500 data-[state=open]:border-violet-400 dark:data-[state=open]:border-violet-500 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/30 shrink-0 gap-2 pl-3"
                aria-label="Consultation type"
              >
                <LayoutList className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
                <SelectValue placeholder="Full Consultation" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 shadow-lg min-w-[200px]">
                <SelectItem
                  value="FULL"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.FULL}
                </SelectItem>
                <SelectItem
                  value="QUICK_RX"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.QUICK_RX}
                </SelectItem>
                <SelectItem
                  value="TEST_ONLY"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.TEST_ONLY}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* 1. Templates (desktop: popover) */}
          <div className="hidden md:block">
            <Popover open={templatesPopoverOpen} onOpenChange={setTemplatesPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-lg"
                  disabled={!encounterId}
                  aria-expanded={templatesPopoverOpen}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Templates
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="end">
                {renderTemplatesPickerList()}
              </PopoverContent>
            </Popover>
          </div>
          {/* Save Template (desktop) */}
          <div className="hidden md:block">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg min-h-[44px] touch-manipulation md:min-h-0"
              onClick={() => setShowSaveTemplateModal(true)}
              disabled={!encounterId}
            >
              <Star className="h-4 w-4" />
              Save Template
            </Button>
          </div>
          {/* 2. View Pre Consultation */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg min-h-[44px] touch-manipulation md:min-h-0"
            onClick={() => setShowViewPre(true)}
            disabled={!encounterId}
          >
            <FileText className="h-4 w-4" />
            View Pre
          </Button>
          {/* Start New Visit – on consultation page only (not on pre-consultation) */}
          {/* <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 rounded-lg min-h-[44px] touch-manipulation md:min-h-0"
            onClick={() => setShowStartNewVisitConfirm(true)}
          >
            {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start New Visit
          </Button> */}
          {/* 3. Preview Rx */}
          <div className="hidden md:block">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg border-violet-200 dark:border-violet-800 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 hover:text-violet-800 dark:hover:text-violet-200"
              onClick={handlePreview}
              disabled={!encounterId || !consultationId || isPreviewLoading}
            >
              {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview Rx
            </Button>
          </div>
          {/* 4. End Consultation */}
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] touch-manipulation md:min-h-0 border-0"
            onClick={() => setShowEndConsultationConfirm(true)}
            disabled={isEndingConsultation}
          >
            {isEndingConsultation ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            End Consultation
          </Button>
          {/* Mobile: Actions dropdown (Templates, Preview Rx – View Pre & End Consultation are buttons above) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg md:hidden min-h-[44px] touch-manipulation">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="gap-2 py-3"
                disabled={!encounterId}
                onSelect={(e) => {
                  e.preventDefault();
                  setTemplatesMobileOpen(true);
                }}
              >
                <FileText className="h-4 w-4" />
                Templates
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 py-3"
                disabled={!encounterId}
                onClick={() => setShowSaveTemplateModal(true)}
              >
                <Star className="h-4 w-4" />
                Save Template
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 py-3"
                onClick={handlePreview}
                disabled={!encounterId || !consultationId || isPreviewLoading}
              >
                {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview Rx
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            {/* Cancel button – uncomment to show in header */}
            {/* <Button
              size="sm"
              className="gap-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 min-h-[44px] touch-manipulation md:min-h-0 border-0"
              onClick={() => setShowCancelConfirm(true)}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button> */}
        </div>
      </div>

      <AlertDialog open={showCancelConfirm} onOpenChange={(open) => !isCancelling && setShowCancelConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes will be lost. This visit will be marked as cancelled and you can start a new one. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Stay</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={async () => {
                const id = encounterId;
                if (!id) {
                  toast.error("Cannot cancel: no encounter. Refresh the page or go back to the dashboard.");
                  return;
                }
                setIsCancelling(true);
                try {
                  await backendAxiosClient.post(`/consultations/encounter/${id}/cancel/`);
                } catch (err: unknown) {
                  const ax = err as { response?: { data?: { detail?: string }; status?: number } };
                  const msg = ax.response?.data?.detail ?? "Failed to cancel visit.";
                  toast.error(String(msg));
                  setIsCancelling(false);
                  return;
                }
                useConsultationStore.getState().reset();
                setShowCancelConfirm(false);
                setIsCancelling(false);
                toast.success("Visit cancelled. You can start a new visit from the dashboard.");
                // Defer navigation to next tick so React can commit state and avoid hook-order issues during transition
                setTimeout(() => {
                  router.replace("/doctor-dashboard");
                }, 0);
              }}
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancel consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFollowUpConfirm} onOpenChange={setShowFollowUpConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No follow-up scheduled</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to continue without scheduling a follow-up visit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFollowUpConfirm(false)}>
              Continue
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFollowUpConfirm(false);
                setSelectedSymptomId(null);
                setSelectedDetail({ section: "follow_up" });
                window.dispatchEvent(new Event(EXPAND_FOLLOW_UP_SIDEBAR_EVENT));
                document
                  .getElementById("follow-up-menu")
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                activateSection("follow_up");
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Follow-Up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EndConsultationReviewModal
        open={showEndConsultationConfirm}
        onOpenChange={setShowEndConsultationConfirm}
        onStay={() => setShowEndConsultationConfirm(false)}
        onConfirmEnd={handleEndConsultation}
        isEndingConsultation={isEndingConsultation}
        data={endConsultationReviewData}
        hasFollowUp={isFollowUpSet(useConsultationStore.getState())}
      />

      <SaveTemplateModal open={showSaveTemplateModal} onOpenChange={setShowSaveTemplateModal} />

      <Dialog open={templatesMobileOpen} onOpenChange={setTemplatesMobileOpen}>
        <DialogContent className="gap-0 p-4 sm:max-w-md md:hidden" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
          </DialogHeader>
          <div className="pt-1">{renderTemplatesPickerList()}</div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showStartNewVisitConfirm} onOpenChange={setShowStartNewVisitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start new visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This visit is still active. End this visit and start a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStartingNewVisit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNewVisit} disabled={isStartingNewVisit} className="bg-blue-600 hover:bg-blue-700">
              {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              End & Start New Visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {encounterId && (
        <ViewPreDrawer
          open={showViewPre}
          onOpenChange={setShowViewPre}
          encounterId={encounterId}
        />
      )}

      {isFinalizationOverlayVisible && (
        <div
          className="fixed inset-0 z-[100] bg-white/65 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label="Finalizing consultation"
          onWheel={(event) => event.preventDefault()}
          onTouchMove={(event) => event.preventDefault()}
          tabIndex={-1}
        >
          <div className="flex h-full w-full items-center justify-center">
            <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <p className="text-center text-base font-semibold text-gray-900">Finalizing consultation...</p>
              <p className="mt-1 text-center text-sm text-gray-600">Generating prescription...</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
