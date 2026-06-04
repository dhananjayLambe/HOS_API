"use client";

import { useReportDetail } from "@/hooks/labs/useReportDetail";
import { useReportMutations } from "@/hooks/labs/useReportMutations";
import { useReportTaskContext } from "@/hooks/labs/useReportTaskContext";
import { newReportRequestId } from "@/lib/labs/reports/api/report-api-response";
import { mapReportApiErrorToMessage } from "@/lib/labs/reports/api/report-api-errors";
import {
  resolveTargetReportId,
} from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportTaskContext } from "@/lib/labs/reports/report-task-context";
import {
  isReuploadMode,
  isReuploadReasonReady,
  resolveReuploadReason,
  type UploadWorkflowMode,
} from "@/lib/labs/reports/upload/reupload-config";
import { loadReportTasks } from "@/lib/labs/reports/load-report-tasks";
import { DEFAULT_REPORT_TASKS_FILTERS } from "@/lib/labs/reports/build-report-tasks-query";
import { groupTasksByPatient, type PatientReportGroup } from "@/lib/labs/reports/group-report-tasks";
import { isPendingUploadStatus } from "@/lib/labs/reports/report-operational-status";
import { searchReportTasks } from "@/lib/labs/reports/search-report-tasks";
import {
  clearUploadDraft,
  draftNeedsFileReselect,
  loadUploadDraft,
  saveUploadDraft,
  type UploadDraftFileMeta,
} from "@/lib/labs/reports/upload/upload-draft-storage";
import {
  pickPrimaryFileId,
  primaryAfterRemove,
} from "@/lib/labs/reports/upload/upload-primary-selection";
import {
  UPLOAD_ACCEPT_ATTR,
  validateIncomingFiles,
  type UploadFileRejection,
} from "@/lib/labs/reports/upload/upload-file-validation";
import {
  adaptReportTaskContext,
  type UploadTaskContext,
} from "@/lib/labs/reports/upload/upload-task-context-adapter";
import {
  getNextStep,
  getPreviousStep,
  type UploadWorkflowStep,
} from "@/lib/labs/reports/upload/upload-workflow-machine";
import {
  parseUploadWorkflowSearchParams,
  type UploadRouteState,
} from "@/lib/labs/reports/upload/upload-route";
import { isReportTasksV1ApiEnabled } from "@/lib/labs/reports/report-tasks-config";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type { UploadWorkflowStep };

export type UploadFileItem = UploadDraftFileMeta & {
  file?: File;
  objectUrl?: string;
};

export type TaskLoadState = "none" | "loading" | "ready" | "invalid" | "malformed";

export type SubmissionState = "idle" | "uploading" | "success" | "failed";

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

function metaFromDraft(meta: UploadDraftFileMeta): UploadFileItem {
  return { ...meta, objectUrl: undefined };
}

function lineRequiresReupload(line: ReportTaskContext["activeReports"][number]): boolean {
  if (line.availableActions.some((a) => a.trim().toUpperCase() === "CORRECT_REPORT")) {
    return true;
  }
  const status = String(line.status || "").trim().toLowerCase();
  return status !== "pending" && status !== "";
}

export function useReportUploadWizard(routeState?: UploadRouteState) {
  const searchParams = useSearchParams();
  const parsedRoute = routeState ?? parseUploadWorkflowSearchParams(searchParams);
  const { data: session } = useLabSession();
  const branchId = session?.branch?.id ?? null;
  const branchLabel = session?.branch?.branch_name ?? "";
  const hasTaskIdInUrl = !!parsedRoute.taskId;

  const [selectedTaskIdOverride, setSelectedTaskIdOverride] = useState<string | null>(null);
  const resolvedTaskId = parsedRoute.taskId ?? selectedTaskIdOverride;

  const contextQuery = useReportTaskContext(
    branchId,
    resolvedTaskId,
    !!resolvedTaskId && !parsedRoute.taskIdMalformed,
  );

  const [step, setStep] = useState<UploadWorkflowStep>(
    hasTaskIdInUrl ? "files" : "select_task",
  );
  const [pendingTasks, setPendingTasks] = useState<ReportTask[]>([]);
  const [pendingLoading, setPendingLoading] = useState(!hasTaskIdInUrl);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [primaryFileId, setPrimaryFileId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionRequestId, setSubmissionRequestId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<ReportOperationalStatus | null>(null);
  const mutations = useReportMutations(branchId);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);
  const [fileRejections, setFileRejections] = useState<UploadFileRejection[]>([]);
  const [reuploadReasonChoice, setReuploadReasonChoice] = useState("");
  const [reuploadReasonOther, setReuploadReasonOther] = useState("");

  const targetReportId = useMemo(() => {
    const ctx = contextQuery.data;
    if (!ctx) return null;
    return resolveTargetReportId(ctx, parsedRoute.reportId) ?? null;
  }, [contextQuery.data, parsedRoute.reportId]);

  const uploadMode: UploadWorkflowMode = useMemo(() => {
    if (isReuploadMode(parsedRoute.mode)) return "reupload";
    const ctx = contextQuery.data;
    if (!ctx || !targetReportId) return "upload";
    const line = ctx.activeReports.find((r) => r.reportId === targetReportId);
    if (line && lineRequiresReupload(line)) return "reupload";
    return "upload";
  }, [parsedRoute.mode, contextQuery.data, targetReportId]);

  const isReupload = uploadMode === "reupload";

  const reportDetailQuery = useReportDetail(
    branchId,
    targetReportId,
    isReupload && !!targetReportId && isReportTasksV1ApiEnabled(),
  );

  const uploadContext: UploadTaskContext | null = useMemo(() => {
    if (!contextQuery.data) return null;
    const base = adaptReportTaskContext(contextQuery.data, { pendingSiblingCount: 0 });
    if (!targetReportId) return base;
    const line = contextQuery.data.activeReports.find((r) => r.reportId === targetReportId);
    if (!line?.testLabel) return base;
    return { ...base, uploadTestLabel: line.testLabel };
  }, [contextQuery.data, targetReportId]);

  const taskLoadState: TaskLoadState = useMemo(() => {
    if (parsedRoute.taskIdMalformed) return "malformed";
    if (!resolvedTaskId) return "none";
    if (contextQuery.isPending) return "loading";
    if (contextQuery.isError) return "invalid";
    if (uploadContext) return "ready";
    return "loading";
  }, [
    parsedRoute.taskIdMalformed,
    resolvedTaskId,
    contextQuery.isPending,
    contextQuery.isError,
    uploadContext,
  ]);

  useEffect(() => {
    if (hasTaskIdInUrl && taskLoadState === "ready") {
      setStep("files");
    }
  }, [hasTaskIdInUrl, taskLoadState]);

  useEffect(() => {
    if (!resolvedTaskId || taskLoadState !== "ready" || isReupload) return;
    const draft = loadUploadDraft(resolvedTaskId);
    if (!draft) return;
    if (draft.filesMeta.length > 0 && files.length === 0) {
      setFiles(draft.filesMeta.map(metaFromDraft));
      setPrimaryFileId(
        pickPrimaryFileId(draft.filesMeta, draft.primaryFileId),
      );
      setVerified(draft.verified);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTaskId, taskLoadState, isReupload]);

  useEffect(() => {
    if (!isReupload) return;
    setReuploadReasonChoice("");
    setReuploadReasonOther("");
  }, [isReupload, resolvedTaskId, targetReportId]);

  useEffect(() => {
    if (hasTaskIdInUrl) return;
    const controller = new AbortController();
    let cancelled = false;

    async function loadPending() {
      setPendingLoading(true);
      setPendingError(null);
      try {
        const result = await loadReportTasks({
          branchLabel,
          filters: { ...DEFAULT_REPORT_TASKS_FILTERS },
          signal: controller.signal,
        });
        if (cancelled) return;
        setPendingTasks(
          result.tasks.filter((t) => isPendingUploadStatus(t.operationalStatus)),
        );
      } catch (err) {
        if (cancelled) return;
        setPendingError(err instanceof Error ? err.message : "Could not load pending tasks.");
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    }

    void loadPending();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [branchLabel, hasTaskIdInUrl]);

  const searchedPending = useMemo(
    () => searchReportTasks(pendingTasks, searchInput),
    [pendingTasks, searchInput],
  );

  const pendingGroups = useMemo(
    () => groupTasksByPatient(searchedPending),
    [searchedPending],
  );

  const selectTask = useCallback((task: ReportTask) => {
    setSelectedTaskIdOverride(task.taskId);
    setStep("files");
    setFiles([]);
    setPrimaryFileId(null);
    setVerified(false);
    setDraftBannerDismissed(false);
    const draft = loadUploadDraft(task.taskId);
    if (draft?.filesMeta.length) {
      setFiles(draft.filesMeta.map(metaFromDraft));
      setPrimaryFileId(pickPrimaryFileId(draft.filesMeta, draft.primaryFileId));
      setVerified(draft.verified);
    }
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      setFiles((prev) => {
        const base = isReupload ? [] : prev;
        const { accepted, rejected } = validateIncomingFiles(list, base);
        if (rejected.length > 0) {
          setFileRejections(rejected);
        } else if (accepted.length > 0) {
          setFileRejections([]);
        }
        if (accepted.length === 0) return prev;

        const capped = isReupload ? accepted.slice(0, 1) : accepted;
        const next = isReupload ? [] : [...prev];
        for (const f of capped) {
          const meta = fileMeta(f);
          if (!next.some((x) => x.id === meta.id)) next.push(meta);
        }
        setPrimaryFileId((pid) => pickPrimaryFileId(next, pid));
        return next;
      });
      setDraftBannerDismissed(true);
    },
    [isReupload],
  );

  const dismissFileRejections = useCallback(() => {
    setFileRejections([]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      const next = prev.filter((f) => f.id !== id);
      setPrimaryFileId((pid) => primaryAfterRemove(next, id, pid));
      return next;
    });
  }, []);

  const setPrimary = useCallback((id: string) => {
    setPrimaryFileId(id);
  }, []);

  const saveDraft = useCallback(() => {
    if (!resolvedTaskId || isReupload) return;
    saveUploadDraft({
      version: 1,
      savedAt: new Date().toISOString(),
      taskId: resolvedTaskId,
      filesMeta: files.map(({ id, name, size, type }) => ({ id, name, size, type })),
      primaryFileId,
      verified,
    });
  }, [resolvedTaskId, files, primaryFileId, verified, isReupload]);

  const uploadDraftOnly = useCallback(async () => {
    if (!resolvedTaskId || files.length === 0 || isReupload) return false;
    const ctx = contextQuery.data;
    if (!ctx || !isReportTasksV1ApiEnabled()) return false;
    const reportId = resolveTargetReportId(ctx, parsedRoute.reportId);
    if (!reportId) return false;
    const fileObjects = files.map((f) => f.file).filter((f): f is File => !!f);
    if (fileObjects.length === 0) return false;
    const primaryIndex = Math.max(0, files.findIndex((f) => f.id === primaryFileId));
    try {
      await mutations.uploadReport({
        reportId,
        files: fileObjects,
        primaryFileIndex: primaryIndex,
        uploadIntent: "UPLOAD_NEW",
        uploadRequestId: globalThis.crypto?.randomUUID?.() ?? undefined,
        taskId: resolvedTaskId,
        assignmentId: ctx.assignmentId,
      });
      saveUploadDraft({
        version: 1,
        savedAt: new Date().toISOString(),
        taskId: resolvedTaskId,
        filesMeta: files.map(({ id, name, size, type }) => ({ id, name, size, type })),
        primaryFileId,
        verified,
      });
      return true;
    } catch {
      return false;
    }
  }, [resolvedTaskId, files, primaryFileId, verified, contextQuery.data, mutations, isReupload, parsedRoute.reportId]);

  const reuploadReasonResolved = useMemo(
    () => resolveReuploadReason(reuploadReasonChoice, reuploadReasonOther),
    [reuploadReasonChoice, reuploadReasonOther],
  );

  const submit = useCallback(
    async (onSuccess?: () => void) => {
      if (!resolvedTaskId || files.length === 0 || !verified) return;
      if (isReupload && !reuploadReasonResolved) return;
      if (submissionState === "uploading") return;

      const requestId = newReportRequestId();
      if (submissionRequestId === requestId) return;
      setSubmissionRequestId(requestId);
      setSubmissionState("uploading");
      setSubmitError(null);

      if (!isReportTasksV1ApiEnabled()) {
        setSubmissionState("failed");
        setSubmitError("Live report upload is not enabled. Set NEXT_PUBLIC_LAB_REPORTS_USE_V1_API=true.");
        return;
      }

      const ctx = contextQuery.data;
      if (!ctx) {
        setSubmissionState("failed");
        setSubmitError("Task context is not loaded yet.");
        return;
      }

      const reportId = resolveTargetReportId(ctx, parsedRoute.reportId);
      if (!reportId) {
        setSubmissionState("failed");
        setSubmitError("No upload target for this task. Refresh the queue and try again.");
        return;
      }

      const fileObjects = files.map((f) => f.file).filter((f): f is File => !!f);
      if (fileObjects.length === 0) {
        setSubmissionState("failed");
        setSubmitError("Re-select files to upload — draft metadata cannot be submitted.");
        return;
      }

      if (isReupload && fileObjects.length !== 1) {
        setSubmissionState("failed");
        setSubmitError("Re-upload accepts exactly one replacement file.");
        return;
      }

      const primaryIndex = Math.max(
        0,
        files.findIndex((f) => f.id === primaryFileId),
      );

      try {
        let result = await mutations.uploadReport({
          reportId,
          files: isReupload ? fileObjects.slice(0, 1) : fileObjects,
          primaryFileIndex: primaryIndex,
          uploadIntent: isReupload ? "REUPLOAD_REPLACE" : "UPLOAD_NEW",
          notes: isReupload ? reuploadReasonResolved ?? undefined : undefined,
          uploadRequestId: globalThis.crypto?.randomUUID?.() ?? undefined,
          requestId,
          taskId: resolvedTaskId,
          assignmentId: ctx.assignmentId,
        });

        try {
          await mutations.markReady(reportId, {
            taskId: resolvedTaskId,
            reportId,
            assignmentId: ctx.assignmentId,
          });
          result = { ...result, status: "READY_DELIVERY" as ReportOperationalStatus };
        } catch (readyErr) {
          await mutations.handleOperationalConflict(readyErr, {
            taskId: resolvedTaskId,
            reportId,
            assignmentId: ctx.assignmentId,
          });
          setSubmitError(mapReportApiErrorToMessage(readyErr));
        }

        clearUploadDraft(resolvedTaskId);
        await contextQuery.refetch();
        setSubmittedStatus(result.status);
        setSubmissionState("success");
        setStep("success");
        onSuccess?.();
      } catch (err) {
        const conflict = await mutations.handleOperationalConflict(err, {
          taskId: resolvedTaskId,
          reportId,
          assignmentId: ctx.assignmentId,
        });
        setSubmitError(mapReportApiErrorToMessage(err));
        setSubmissionState("failed");
        if (conflict) return;
      }
    },
    [
      resolvedTaskId,
      files,
      primaryFileId,
      verified,
      submissionState,
      submissionRequestId,
      contextQuery.data,
      contextQuery.refetch,
      mutations,
      isReupload,
      reuploadReasonResolved,
      parsedRoute.reportId,
    ],
  );

  const continueNextReport = useCallback(async () => {
    await contextQuery.refetch();
    setFiles([]);
    setPrimaryFileId(null);
    setVerified(false);
    setSubmittedStatus(null);
    setSubmissionState("idle");
    setSubmissionRequestId(null);
    setSubmitError(null);
    setSubmitAttempted(false);
    setDraftBannerDismissed(false);
    setStep("files");
  }, [contextQuery]);

  const resetForAnother = useCallback(() => {
    setSelectedTaskIdOverride(null);
    setFiles([]);
    setPrimaryFileId(null);
    setVerified(false);
    setSubmittedStatus(null);
    setSubmissionState("idle");
    setSubmissionRequestId(null);
    setSubmitError(null);
    setSubmitAttempted(false);
    setDraftBannerDismissed(false);
    setStep(hasTaskIdInUrl ? "files" : "select_task");
  }, [hasTaskIdInUrl]);

  const goNext = useCallback(() => {
    const next = getNextStep(step, hasTaskIdInUrl || !!resolvedTaskId);
    if (next) setStep(next);
  }, [step, hasTaskIdInUrl, resolvedTaskId]);

  const goBack = useCallback(() => {
    const prev = getPreviousStep(step, hasTaskIdInUrl || !!resolvedTaskId);
    if (prev) setStep(prev);
    else if (step === "files" && !hasTaskIdInUrl) setStep("select_task");
  }, [step, hasTaskIdInUrl, resolvedTaskId]);

  const tryAdvance = useCallback(() => {
    setSubmitAttempted(true);
    goNext();
  }, [goNext]);

  const trySubmit = useCallback(
    (onSuccess?: () => void) => {
      setSubmitAttempted(true);
      if (!verified || files.length === 0) return;
      if (isReupload && !reuploadReasonResolved) return;
      void submit(onSuccess);
    },
    [submit, verified, files.length, isReupload, reuploadReasonResolved],
  );

  const primaryFile = files.find((f) => f.id === primaryFileId) ?? files[0] ?? null;
  const loadedDraft = resolvedTaskId ? loadUploadDraft(resolvedTaskId) : null;
  const showDraftReselectBanner =
    !isReupload &&
    !draftBannerDismissed &&
    draftNeedsFileReselect(
      loadedDraft,
      files.filter((f) => !!f.file).length,
    );

  const reuploadReasonReady = isReuploadReasonReady(reuploadReasonChoice, reuploadReasonOther);

  const contextLoading = !!resolvedTaskId && contextQuery.isPending;
  const loading = hasTaskIdInUrl
    ? taskLoadState === "loading"
    : pendingLoading || (step !== "select_task" && contextLoading);
  const error = useMemo(() => {
    if (taskLoadState === "malformed") return "Invalid task link.";
    if (resolvedTaskId && taskLoadState === "invalid") {
      return "Task not found or no longer available.";
    }
    if (!hasTaskIdInUrl) return pendingError;
    return null;
  }, [taskLoadState, resolvedTaskId, hasTaskIdInUrl, pendingError]);

  return {
    route: parsedRoute,
    step,
    setStep,
    loading,
    error,
    taskLoadState,
    searchInput,
    setSearchInput,
    pendingGroups,
    pendingTasks: searchedPending,
    uploadContext,
    selectTask,
    files,
    addFiles,
    removeFile,
    fileRejections,
    dismissFileRejections,
    primaryFileId,
    setPrimary,
    primaryFile,
    verified,
    setVerified,
    saveDraft,
    uploadDraftOnly,
    submit,
    trySubmit,
    tryAdvance,
    goBack,
    submitting: submissionState === "uploading",
    submissionState,
    submitError,
    submitAttempted,
    submittedStatus,
    resetForAnother,
    continueNextReport,
    accept: UPLOAD_ACCEPT_ATTR,
    hasTaskIdInUrl,
    resolvedTaskId,
    showDraftReselectBanner,
    dismissDraftBanner: () => setDraftBannerDismissed(true),
    uploadMode,
    isReupload,
    targetReportId,
    reportDetail: reportDetailQuery.data ?? null,
    reportDetailLoading: reportDetailQuery.isPending,
    reuploadReasonChoice,
    reuploadReasonOther,
    setReuploadReasonChoice,
    setReuploadReasonOther,
    reuploadReasonResolved,
    workflowContext: {
      hasTaskIdInUrl: hasTaskIdInUrl || !!resolvedTaskId,
      fileCount: files.filter((f) => !!f.file).length,
      metadataOnlyCount: files.filter((f) => !f.file).length,
      verified,
      canUpload: session?.permissions.can_upload_reports ?? true,
      submitAttempted,
      isReupload,
      reuploadReasonReady,
      maxFiles: isReupload ? 1 : undefined,
    },
  };
}

export type { PatientReportGroup };
