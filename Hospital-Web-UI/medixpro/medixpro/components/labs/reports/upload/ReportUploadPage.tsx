"use client";

import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { UploadWorkflowActionBar } from "@/components/labs/reports/upload/footer/UploadWorkflowActionBar";
import { UploadWorkflowLayout } from "@/components/labs/reports/upload/layout/UploadWorkflowLayout";
import { UploadWorkflowStepper } from "@/components/labs/reports/upload/shared/UploadWorkflowStepper";
import { UploadTaskSummarySidebar } from "@/components/labs/reports/upload/sidebar/UploadTaskSummarySidebar";
import { FileUploadStep } from "@/components/labs/reports/upload/steps/FileUploadStep";
import { PendingTaskQueue } from "@/components/labs/reports/upload/steps/PendingTaskQueue";
import { UploadConfirmationStep } from "@/components/labs/reports/upload/steps/UploadConfirmationStep";
import { UploadPreviewStep } from "@/components/labs/reports/upload/steps/UploadPreviewStep";
import { UploadSuccessStep } from "@/components/labs/reports/upload/steps/UploadSuccessStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReportMutations } from "@/hooks/labs/useReportMutations";
import { useReportUploadWizard } from "@/hooks/labs/useReportUploadWizard";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { buildSendWhatsAppPayload } from "@/lib/labs/reports/build-send-whatsapp-payload";
import {
  buildUploadReturnHref,
  parseUploadWorkflowSearchParams,
} from "@/lib/labs/reports/upload/upload-route";
import { getPrimaryActionForStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
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

  const handleBackToQueue = useCallback(() => {
    void mutations.invalidateReportsQueue().then(() => {
      router.push(reportsListHref);
    });
  }, [mutations, router, reportsListHref]);

  useLabShellHeader({
    title: "Upload report",
    back: shellBack,
    dense: true,
  });

  const handleSendWhatsApp = useCallback(async () => {
    if (!wizard.resolvedTaskId) return;
    setWaSending(true);
    try {
      const reportId = wizard.uploadContext?.historicalReports[0]?.reportId;
      if (!reportId) throw new Error("Missing report id");
      const sendPayload = buildSendWhatsAppPayload(wizard.uploadContext?.patientPhone);
      if (!sendPayload.ok) {
        toast.error(sendPayload.error);
        return;
      }
      await mutations.sendWhatsAppMock(reportId, sendPayload.payload, {
        taskId: wizard.resolvedTaskId,
        reportId,
      });
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

  const showFileRequiredError =
    wizard.submitAttempted &&
    wizard.step === "files" &&
    wizard.files.filter((f) => !!f.file).length === 0;

  const renderMain = () => {
    if (wizard.loading) {
      return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B7280]">
          <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" aria-hidden />
          Loading…
        </div>
      );
    }

    if (wizard.error || wizard.taskLoadState === "malformed") {
      return (
        <div className="rounded-xl border border-[#ECEBFF] bg-[#FAF9FF] px-4 py-8 text-center">
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
      );
    }

    if (wizard.step === "select_task") {
      return (
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
      );
    }

    if (wizard.step === "files" && wizard.resolvedTaskId && !wizard.uploadContext) {
      return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B7280]">
          <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" aria-hidden />
          Loading task…
        </div>
      );
    }

    if (wizard.step === "files" && wizard.uploadContext) {
      return (
        <FileUploadStep
          task={wizard.uploadContext}
          files={wizard.files}
          primaryFileId={wizard.primaryFileId}
          accept={wizard.accept}
          showDraftReselectBanner={wizard.showDraftReselectBanner}
          onDismissDraftBanner={wizard.dismissDraftBanner}
          onAddFiles={wizard.addFiles}
          onRemove={wizard.removeFile}
          onSetPrimary={wizard.setPrimary}
          showFileRequiredError={showFileRequiredError}
          fileRejections={wizard.fileRejections}
          onDismissRejections={wizard.dismissFileRejections}
          submitting={wizard.submitting}
        />
      );
    }

    if (wizard.step === "preview") {
      return (
        <UploadPreviewStep files={wizard.files} primaryFileId={wizard.primaryFileId} />
      );
    }

    if (wizard.step === "confirm" && wizard.uploadContext) {
      return (
        <UploadConfirmationStep
          task={wizard.uploadContext}
          files={wizard.files}
          primaryFileName={wizard.primaryFile?.name ?? null}
          verified={wizard.verified}
          onVerifiedChange={wizard.setVerified}
        />
      );
    }

    if (wizard.step === "success" && wizard.uploadContext && wizard.submittedStatus) {
      return (
        <UploadSuccessStep
          task={wizard.uploadContext}
          status={wizard.submittedStatus}
          returnHref={reportsListHref}
          onSendWhatsApp={handleSendWhatsApp}
          onUploadAnother={wizard.resetForAnother}
          onContinueNextReport={wizard.continueNextReport}
          onBackToQueue={handleBackToQueue}
          sending={waSending}
        />
      );
    }

    if (wizard.taskLoadState === "ready" && !wizard.uploadContext) {
      return (
        <LabOrdersErrorState
          message="Could not load task details."
          onRetry={() => router.refresh()}
        />
      );
    }

    return null;
  };

  const belowMain = (
    <>
      {wizard.submitError && wizard.step === "confirm" ? (
        <p className="text-center text-xs text-red-600" role="alert">
          {wizard.submitError}
        </p>
      ) : null}
      {session && !session.permissions.can_upload_reports ? (
        <p className="text-center text-xs text-amber-700">
          Your role cannot upload reports. Contact an administrator.
        </p>
      ) : null}
    </>
  );

  return (
    <UploadWorkflowLayout
      step={wizard.step}
      stepper={
        wizard.step !== "success" && showWorkflow ? (
          <UploadWorkflowStepper
            step={wizard.step}
            hasTaskIdInUrl={wizard.hasTaskIdInUrl}
            submitAttempted={wizard.submitAttempted}
            workflowContext={{ fileCount: wizard.workflowContext.fileCount }}
            submitting={wizard.submitting}
          />
        ) : null
      }
      main={renderMain()}
      sidebar={
        showWorkflow && wizard.step !== "success" ? (
          <UploadTaskSummarySidebar
            task={wizard.uploadContext}
            primaryFileName={wizard.primaryFile?.name ?? null}
            attachmentCount={wizard.files.length}
          />
        ) : null
      }
      belowMain={belowMain}
      footer={
        showWorkflow ? (
          <UploadWorkflowActionBar
            step={wizard.step}
            embedded={wizard.step === "files" || wizard.step === "preview" || wizard.step === "confirm"}
            workflowContext={wizard.workflowContext}
            submitting={wizard.submitting}
            onSaveDraft={async () => {
              const uploaded = await wizard.uploadDraftOnly();
              if (uploaded) {
                toast.success("Draft uploaded — finalize when ready");
                return;
              }
              wizard.saveDraft();
              toast.success("Draft saved locally");
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
        ) : null
      }
    />
  );
}
