"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, FileText, Save, Eye, X, MoreHorizontal, Stethoscope, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsultationStore } from "@/store/consultationStore";
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
import { useState } from "react";

export function ConsultationActionBar() {
  const router = useRouter();
  const { draftStatus } = useConsultationStore();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const formatDraftTime = (date: Date | null) => {
    if (!date) return null;
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  const handleSaveDraft = () => {
    useConsultationStore.getState().setDraftStatus({
      savedAt: new Date(),
      message: "Draft saved",
    });
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex h-14 min-h-14 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[#eee] bg-white px-3 sm:px-4 md:px-5 shadow-sm dark:border-border dark:bg-background">
        <div className="flex shrink-0 items-center gap-2 md:gap-3 min-h-[44px]">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0 rounded-lg touch-manipulation sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg truncate min-w-0">
            <Stethoscope className="h-5 w-5 shrink-0 text-primary/80" aria-hidden />
            <span className="hidden sm:inline">Start Consultation</span>
            <span className="sm:hidden">Consultation</span>
          </span>
        </div>

        <div className="flex min-w-0 shrink items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_button]:shrink-0">
          {/* Mobile/tablet: Actions in dropdown; desktop: all visible */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Templates
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-1.5 rounded-lg"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            {draftStatus.savedAt && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Draft Saved – {formatDraftTime(draftStatus.savedAt)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Draft options">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View draft history</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
              <Eye className="h-4 w-4" />
              Preview Rx
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg md:hidden min-h-[44px] touch-manipulation">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2 py-3">
                <FileText className="h-4 w-4" />
                Templates
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-3" onClick={handleSaveDraft}>
                <Save className="h-4 w-4" />
                Save Draft
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-3">
                <Eye className="h-4 w-4" />
                Preview Rx
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] touch-manipulation md:min-h-0">
            <CheckCircle className="h-4 w-4" />
            Complete
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 rounded-lg min-h-[44px] touch-manipulation md:min-h-0"
            onClick={() => setShowCancelConfirm(true)}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes will be lost. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                useConsultationStore.getState().reset();
                router.push("/doctor-dashboard");
              }}
            >
              Cancel consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
