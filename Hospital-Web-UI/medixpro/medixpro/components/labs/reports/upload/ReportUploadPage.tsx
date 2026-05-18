"use client";

import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { ConfirmStep } from "@/components/labs/reports/upload/ConfirmStep";
import { FileUploadStep } from "@/components/labs/reports/upload/FileUploadStep";
import { PendingTaskQueue } from "@/components/labs/reports/upload/PendingTaskQueue";
import { PreviewStep } from "@/components/labs/reports/upload/PreviewStep";
import { ReportUploadStepper } from "@/components/labs/reports/upload/ReportUploadStepper";
import { UploadStickyBar } from "@/components/labs/reports/upload/UploadStickyBar";
import { UploadSuccessCard } from "@/components/labs/reports/upload/UploadSuccessCard";
import { UploadSummaryPanel } from "@/components/labs/reports/upload/UploadSummaryPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReportUploadWizard } from "@/hooks/labs/useReportUploadWizard";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { sendTaskWhatsApp } from "@/lib/labs/reports/reports-mock-service";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { Loader2, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export function ReportUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams.get("taskId");

  const demoParam = searchParams.get("demo");
  const reportsListHref = useMemo(() => {
    if (!demoParam) return "/lab-dashboard/reports";
    return `/lab-dashboard/reports?demo=${encodeURIComponent(demoParam)}`;
  }, [demoParam]);

  const shellBack = useMemo(
    () => ({ href: reportsListHref, label: "Reports" as const }),
    [reportsListHref],
  );
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";
  const toast = useToastNotification();
  const canUpload = session?.permissions.can_upload_reports ?? true;

  const wizard = useReportUploadWizard(branchLabel, taskIdFromUrl);
  const [waSending, setWaSending] = useState(false);

  useLabShellHeader({
    title: "Upload report",
    description: "Attach report files for this task",
    back: shellBack,
  });

  const handleSendWhatsApp = useCallback(async () => {
    if (!wizard.selectedTask) return;
    setWaSending(true);
    try {
      await sendTaskWhatsApp(wizard.selectedTask.taskId);
      toast.success("WhatsApp delivery queued");
    } catch {
      toast.error("Could not queue WhatsApp.");
    } finally {
      setWaSending(false);
    }
  }, [wizard.selectedTask, toast]);

  const pendingCount = wizard.selectedTask?.pendingSiblingCount ?? 0;

  const goBack = useCallback(() => {
    if (wizard.step === "select_task") {
      router.push(reportsListHref);
      return;
    }
    if (wizard.step === "files") wizard.setStep("select_task");
    else if (wizard.step === "preview") wizard.setStep("files");
    else if (wizard.step === "confirm") wizard.setStep("preview");
  }, [wizard, router, reportsListHref]);

  const goNextFromFiles = () => {
    if (wizard.files.length === 0) {
      toast.error("Add at least one file.");
      return;
    }
    wizard.setStep("preview");
  };

  return (
    <div className="mx-auto flex min-h-0 max-w-6xl flex-col gap-3 pb-6">
      {wizard.step !== "success" ? <ReportUploadStepper step={wizard.step} /> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <main className="min-w-0 space-y-3">
          {wizard.loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" aria-hidden />
              Loading pending tasks…
            </div>
          ) : wizard.error ? (
            <LabOrdersErrorState message={wizard.error} onRetry={() => window.location.reload()} />
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
                selectedTaskId={wizard.selectedTask?.taskId ?? null}
                onSelectTask={wizard.selectTask}
              />
            </>
          ) : wizard.step === "files" && wizard.selectedTask ? (
            <FileUploadStep
              taskLabel={wizard.selectedTask.testLabel}
              files={wizard.files}
              primaryFileId={wizard.primaryFileId}
              accept={wizard.accept}
              existingReports={wizard.existingReports}
              onAddFiles={wizard.addFiles}
              onRemove={wizard.removeFile}
              onSetPrimary={wizard.setPrimary}
            />
          ) : wizard.step === "preview" ? (
            <PreviewStep files={wizard.files} primaryFileId={wizard.primaryFileId} />
          ) : wizard.step === "confirm" && wizard.selectedTask ? (
            <ConfirmStep
              task={wizard.selectedTask}
              files={wizard.files}
              primaryFileName={wizard.primaryFile?.name ?? null}
              verified={wizard.verified}
              onVerifiedChange={wizard.setVerified}
            />
          ) : wizard.step === "success" && wizard.selectedTask && wizard.submittedStatus ? (
            <UploadSuccessCard
              task={wizard.selectedTask}
              status={wizard.submittedStatus}
              onSendWhatsApp={handleSendWhatsApp}
              onUploadAnother={wizard.resetForAnother}
              sending={waSending}
            />
          ) : null}

          {!wizard.loading && !wizard.error ? (
            <UploadStickyBar
              step={wizard.step}
              canPreview={wizard.files.length > 0}
              canSubmit={
                wizard.files.length > 0 && canUpload && (wizard.step !== "confirm" || wizard.verified)
              }
              submitting={wizard.submitting}
              onSaveDraft={() => {
                wizard.saveDraft();
                toast.success("Draft saved");
              }}
              onPreview={() => {
                if (wizard.step === "files") goNextFromFiles();
                else if (wizard.step === "confirm") wizard.setStep("preview");
                else wizard.setStep("preview");
              }}
              onSubmit={() => {
                if (wizard.step === "files") {
                  goNextFromFiles();
                  wizard.setStep("confirm");
                  return;
                }
                if (wizard.step === "preview") {
                  wizard.setStep("confirm");
                  return;
                }
                void wizard.submit(true);
                toast.success("Report submitted");
              }}
              onBack={goBack}
            />
          ) : null}
        </main>

        {wizard.step !== "success" ? (
          <UploadSummaryPanel
            task={wizard.selectedTask}
            pendingSiblingCount={pendingCount}
            existingReports={wizard.existingReports}
            primaryFileName={wizard.primaryFile?.name ?? null}
            attachmentCount={wizard.files.length}
          />
        ) : null}
      </div>

      {!canUpload ? (
        <p className="text-center text-xs text-amber-700">Your role cannot upload reports. Contact an administrator.</p>
      ) : null}
    </div>
  );
}
