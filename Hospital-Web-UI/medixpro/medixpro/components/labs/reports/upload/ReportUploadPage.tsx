"use client";

import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { FileUploadStep } from "@/components/labs/reports/upload/FileUploadStep";
import { PendingTaskQueue } from "@/components/labs/reports/upload/PendingTaskQueue";
import { UploadConfirmationStep } from "@/components/labs/reports/upload/UploadConfirmationStep";
import { UploadPreviewStep } from "@/components/labs/reports/upload/UploadPreviewStep";
import { UploadSuccessStep } from "@/components/labs/reports/upload/UploadSuccessStep";
import { UploadTaskSummarySidebar } from "@/components/labs/reports/upload/UploadTaskSummarySidebar";
import { UploadWorkflowActionBar } from "@/components/labs/reports/upload/UploadWorkflowActionBar";
import { UploadWorkflowStepper } from "@/components/labs/reports/upload/UploadWorkflowStepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReportMutations } from "@/hooks/labs/useReportMutations";
import { useReportUploadWizard } from "@/hooks/labs/useReportUploadWizard";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import {
  buildUploadReturnHref,
  parseUploadWorkflowSearchParams,
} from "@/lib/labs/reports/upload/upload-route";
import { UPLOAD_MAIN_BOTTOM_PADDING_CLASSNAME } from "@/lib/labs/reports/upload/upload-validation-messages";
import { getPrimaryActionForStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { cn } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export function ReportUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const route = useMemo(() => parseUploadWorkflowSearchParams(searchParams), [searchParams]);
  const returnHref = useMemo(
    () => buildUploadReturnHref(route.returnUrl),
    [route.returnUrl],
  );

  const demoParam = route.demo;
  const reportsListHref = useMemo(() => {
    if (!demoParam) return returnHref;
    const sep = returnHref.includes("?") ? "&" : "?";
    return `${returnHref}${sep}demo=${encodeURIComponent(demoParam)}`;
  }, [demoParam, returnHref]);

  const shellBack = useMemo(
    () => ({ href: reportsListHref, label: "Reports" as const }),
    [reportsListHref],
  );

  const { data: session } = useLabSession();
  const toast = useToastNotification();
  const wizard = useReportUploadWizard(route);
  const mutations = useReportMutations(session?.branch?.id);
  const [waSending, setWaSending] = useState(false);

  useLabShellHeader({
    title: "Upload report",
    description: "Attach report files for this task",
    back: shellBack,
  });

  const handleSendWhatsApp = useCallback(async () => {
    if (!wizard.resolvedTaskId) return;
    setWaSending(true);
    try {
      const reportId = wizard.uploadContext?.historicalReports[0]?.reportId;
      await mutations.sendWhatsAppMock(wizard.resolvedTaskId, reportId);
      toast.success("WhatsApp delivery queued");
    } catch {
      toast.error("Could not queue WhatsApp.");
    } finally {
      setWaSending(false);
    }
  }, [wizard.resolvedTaskId, wizard.uploadContext, mutations, toast]);

  const handlePrimary = useCallback(() => {
    const action = getPrimaryActionForStep(wizard.step);
    if (action === "upload") {
      wizard.trySubmit(() => toast.success("Report submitted"));
      return;
    }
    wizard.tryAdvance();
  }, [wizard, toast]);

  const showWorkflow =
    !wizard.loading &&
    !wizard.error &&
    wizard.taskLoadState !== "malformed";

  return (
    <div className="mx-auto flex min-h-0 max-w-6xl flex-col gap-3">
      {wizard.step !== "success" && showWorkflow ? (
        <UploadWorkflowStepper
          step={wizard.step}
          hasTaskIdInUrl={wizard.hasTaskIdInUrl}
          submitAttempted={wizard.submitAttempted}
        />
      ) : null}

      <div
        className={cn(
          "grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]",
          showWorkflow && wizard.step !== "success" && UPLOAD_MAIN_BOTTOM_PADDING_CLASSNAME,
        )}
      >
        <main className="min-w-0 space-y-3">
          {wizard.loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" aria-hidden />
              Loading…
            </div>
          ) : wizard.error || wizard.taskLoadState === "malformed" ? (
            <div className="rounded-xl border border-[#ECEBFF] bg-[#FAFAFF] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[#111827]">
                {wizard.taskLoadState === "malformed"
                  ? "Invalid task link."
                  : "Task not found or no longer available"}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                The task may have been completed or removed from your queue.
              </p>
              <Button type="button" size="sm" className="mt-4" asChild>
                <Link href={reportsListHref}>Return to reports queue</Link>
              </Button>
            </div>
          ) : wizard.step === "select_task" ? (
            <>
              <div>
                <Label className="text-xs">Search pending tasks</Label>
                <div className="relative mt-1">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                    aria-hidden
                  />
                  <Input
                    className="h-9 pl-9"
                    placeholder="Patient, phone, order ID, test"
                    value={wizard.searchInput}
                    onChange={(e) => wizard.setSearchInput(e.target.value)}
                  />
                </div>
              </div>
              <PendingTaskQueue
                groups={wizard.pendingGroups}
                tasks={wizard.pendingTasks}
                selectedTaskId={wizard.resolvedTaskId}
                onSelectTask={wizard.selectTask}
              />
            </>
          ) : wizard.step === "files" && wizard.resolvedTaskId && !wizard.uploadContext ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" aria-hidden />
              Loading task…
            </div>
          ) : wizard.step === "files" && wizard.uploadContext ? (
            <FileUploadStep
              taskLabel={wizard.uploadContext.testLabelSummary}
              files={wizard.files}
              primaryFileId={wizard.primaryFileId}
              accept={wizard.accept}
              historicalReports={wizard.uploadContext.historicalReports}
              showDraftReselectBanner={wizard.showDraftReselectBanner}
              onDismissDraftBanner={wizard.dismissDraftBanner}
              onAddFiles={wizard.addFiles}
              onRemove={wizard.removeFile}
              onSetPrimary={wizard.setPrimary}
            />
          ) : wizard.step === "preview" ? (
            <UploadPreviewStep files={wizard.files} primaryFileId={wizard.primaryFileId} />
          ) : wizard.step === "confirm" && wizard.uploadContext ? (
            <UploadConfirmationStep
              task={wizard.uploadContext}
              files={wizard.files}
              primaryFileName={wizard.primaryFile?.name ?? null}
              verified={wizard.verified}
              onVerifiedChange={wizard.setVerified}
            />
          ) : wizard.step === "success" && wizard.uploadContext && wizard.submittedStatus ? (
            <UploadSuccessStep
              task={wizard.uploadContext}
              status={wizard.submittedStatus}
              returnHref={reportsListHref}
              onSendWhatsApp={handleSendWhatsApp}
              onUploadAnother={wizard.resetForAnother}
              sending={waSending}
            />
          ) : wizard.taskLoadState === "ready" && !wizard.uploadContext ? (
            <LabOrdersErrorState
              message="Could not load task details."
              onRetry={() => router.refresh()}
            />
          ) : null}
        </main>

        {showWorkflow && wizard.step !== "success" ? (
          <UploadTaskSummarySidebar
            task={wizard.uploadContext}
            primaryFileName={wizard.primaryFile?.name ?? null}
            attachmentCount={wizard.files.length}
          />
        ) : null}
      </div>

      {wizard.submitError && wizard.step === "confirm" ? (
        <p className="text-center text-xs text-red-600" role="alert">
          {wizard.submitError}
        </p>
      ) : null}

      {showWorkflow ? (
        <UploadWorkflowActionBar
          step={wizard.step}
          workflowContext={wizard.workflowContext}
          submitting={wizard.submitting}
          onSaveDraft={() => {
            wizard.saveDraft();
            toast.success("Draft saved");
          }}
          onPrimary={handlePrimary}
          onBack={() => {
            if (wizard.step === "select_task") {
              router.push(reportsListHref);
              return;
            }
            wizard.goBack();
          }}
        />
      ) : null}

      {session && !session.permissions.can_upload_reports ? (
        <p className="pb-4 text-center text-xs text-amber-700">
          Your role cannot upload reports. Contact an administrator.
        </p>
      ) : null}
    </div>
  );
}
