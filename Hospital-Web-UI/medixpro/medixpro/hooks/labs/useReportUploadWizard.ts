"use client";

import { fetchLabOrdersList } from "@/lib/labs/api/orders";
import { mapLabOrderListItems } from "@/lib/labs/orders/map-order-row";
import { DEFAULT_LAB_ORDERS_FILTERS } from "@/lib/labs/orders/build-lab-orders-query";
import { existingReportsForPatient } from "@/lib/labs/reports/existing-reports";
import { groupTasksByPatient, type PatientReportGroup } from "@/lib/labs/reports/group-report-tasks";
import { isPendingUploadStatus } from "@/lib/labs/reports/report-operational-status";
import { searchReportTasks } from "@/lib/labs/reports/search-report-tasks";
import {
  clearTaskDraft,
  loadTaskDraft,
  saveTaskDraft,
  submitReportTask,
  type UploadDraftFileMeta,
} from "@/lib/labs/reports/reports-mock-service";
import {
  getDemoReportTasks,
  isReportsDemoForced,
  shouldUseReportsDemoData,
} from "@/lib/labs/reports/reports-demo-queue";
import { buildReportTasksFromOrders, type ReportTask } from "@/lib/labs/reports/report-task";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type UploadWizardStep = "select_task" | "files" | "preview" | "confirm" | "success";

export type UploadFileItem = UploadDraftFileMeta & {
  file?: File;
  objectUrl?: string;
};

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.txt,.zip,application/pdf,image/jpeg,image/png,text/csv,text/plain,application/zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".zip")) return "application/zip";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".txt")) return "text/plain";
  return file.type;
}

function fileMeta(file: File): UploadFileItem {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const type = inferMimeType(file);
  return {
    id,
    name: file.name,
    size: file.size,
    type,
    file,
    objectUrl: URL.createObjectURL(file),
  };
}

export function useReportUploadWizard(branchLabel = "", initialTaskId?: string | null) {
  const searchParams = useSearchParams();
  const forceDemo = isReportsDemoForced(searchParams);

  const [step, setStep] = useState<UploadWizardStep>("select_task");
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [selectedTask, setSelectedTask] = useState<ReportTask | null>(null);
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [primaryFileId, setPrimaryFileId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<ReportTask["operationalStatus"] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchLabOrdersList(
          {
            filters: { ...DEFAULT_LAB_ORDERS_FILTERS, status: "IN_PROGRESS" },
            page: 1,
            pageSize: 100,
            q: "",
          },
          { signal: controller.signal },
        );
        if (cancelled) return;
        const apiBuilt = buildReportTasksFromOrders(mapLabOrderListItems(res.results, branchLabel));
        const useDemo = shouldUseReportsDemoData({
          apiTaskCount: apiBuilt.length,
          loading: false,
          error: null,
          forceDemo,
        });
        const built = useDemo ? getDemoReportTasks() : apiBuilt;
        setTasks(built);

        if (initialTaskId) {
          const match = built.find((t) => t.taskId === initialTaskId);
          if (match) {
            setSelectedTask(match);
            const draft = loadTaskDraft(match.taskId);
            if (draft?.files?.length) {
              setFiles(draft.files.map((f) => ({ ...f, objectUrl: undefined })));
              setPrimaryFileId(draft.primaryFileId);
              setVerified(draft.verified);
            }
            setStep("files");
          }
        }
      } catch (err) {
        if (cancelled || axios.isCancel(err)) return;
        setError(err instanceof Error ? err.message : "Could not load pending tasks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchLabel, initialTaskId, forceDemo]);

  const pendingTasks = useMemo(
    () => tasks.filter((t) => isPendingUploadStatus(t.operationalStatus)),
    [tasks],
  );

  const searchedPending = useMemo(
    () => searchReportTasks(pendingTasks, searchInput),
    [pendingTasks, searchInput],
  );

  const pendingGroups = useMemo(() => groupTasksByPatient(searchedPending), [searchedPending]);

  const existingReports = useMemo(() => {
    if (!selectedTask) return [];
    return existingReportsForPatient(tasks, selectedTask.patientKey, selectedTask.taskId);
  }, [tasks, selectedTask]);

  function selectTaskInternal(task: ReportTask) {
    setSelectedTask(task);
    const draft = loadTaskDraft(task.taskId);
    if (draft?.files?.length) {
      setFiles(
        draft.files.map((f) => ({
          ...f,
          objectUrl: undefined,
        })),
      );
      setPrimaryFileId(draft.primaryFileId);
      setVerified(draft.verified);
    } else {
      setFiles([]);
      setPrimaryFileId(null);
      setVerified(false);
    }
  }

  const selectTask = useCallback((task: ReportTask) => {
    selectTaskInternal(task);
    setStep("files");
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles((prev) => {
      const next = [...prev];
      for (const f of list) {
        const meta = fileMeta(f);
        if (!next.some((x) => x.id === meta.id)) next.push(meta);
      }
      if (!primaryFileId && next.length > 0) {
        setPrimaryFileId(next[0]!.id);
      }
      return next;
    });
  }, [primaryFileId]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      const next = prev.filter((f) => f.id !== id);
      setPrimaryFileId((pid) => (pid === id ? (next[0]?.id ?? null) : pid));
      return next;
    });
  }, []);

  const setPrimary = useCallback((id: string) => {
    setPrimaryFileId(id);
  }, []);

  const saveDraft = useCallback(() => {
    if (!selectedTask) return;
    saveTaskDraft(selectedTask.taskId, {
      taskId: selectedTask.taskId,
      files: files.map(({ id, name, size, type }) => ({ id, name, size, type })),
      primaryFileId,
      verified,
      savedAt: new Date().toISOString(),
    });
  }, [selectedTask, files, primaryFileId, verified]);

  const submit = useCallback(
    async (markReadyOnSubmit = false) => {
      if (!selectedTask || files.length === 0 || !verified) return;
      setSubmitting(true);
      try {
        const result = await submitReportTask(selectedTask.taskId, {
          files: files.map(({ id, name, size, type }) => ({ id, name, size, type })),
          primaryFileId,
          markReadyOnSubmit,
        });
        clearTaskDraft(selectedTask.taskId);
        setSubmittedStatus(result.status);
        setStep("success");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedTask, files, primaryFileId, verified],
  );

  const resetForAnother = useCallback(() => {
    setSelectedTask(null);
    setFiles([]);
    setPrimaryFileId(null);
    setVerified(false);
    setSubmittedStatus(null);
    setStep("select_task");
  }, []);

  const primaryFile = files.find((f) => f.id === primaryFileId) ?? files[0] ?? null;

  return {
    step,
    setStep,
    loading,
    error,
    searchInput,
    setSearchInput,
    pendingGroups,
    pendingTasks,
    selectedTask,
    selectTask,
    existingReports,
    files,
    addFiles,
    removeFile,
    primaryFileId,
    setPrimary,
    primaryFile,
    verified,
    setVerified,
    saveDraft,
    submit,
    submitting,
    submittedStatus,
    resetForAnother,
    accept: ACCEPT,
  };
}

export type { PatientReportGroup };
