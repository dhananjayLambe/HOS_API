"use client";

import {
  UPLOAD_CONTENT_GRID,
  UPLOAD_LEFT_COLUMN,
  UPLOAD_PAGE_ROOT,
  UPLOAD_STEP_PANEL,
  UPLOAD_STEP_PANEL_BODY,
  UPLOAD_STEP_PANEL_FOOTER,
  UPLOAD_STEPPER_WRAPPER,
} from "@/lib/labs/reports/upload/upload-layout-styles";
import type { UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const PANEL_STEPS: UploadWorkflowStep[] = ["files", "preview", "confirm"];

export type UploadWorkflowLayoutProps = {
  step?: UploadWorkflowStep;
  stepper?: ReactNode;
  main: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  belowMain?: ReactNode;
};

export function UploadWorkflowLayout({
  step,
  stepper,
  main,
  sidebar,
  footer,
  belowMain,
}: UploadWorkflowLayoutProps) {
  const useStepPanel = step != null && PANEL_STEPS.includes(step) && footer != null;

  return (
    <div className={UPLOAD_PAGE_ROOT}>
      <div className={UPLOAD_CONTENT_GRID}>
        <div className={UPLOAD_LEFT_COLUMN}>
          {stepper ? (
            <div className={cn(UPLOAD_STEPPER_WRAPPER, "mb-1.5")}>{stepper}</div>
          ) : null}

          {useStepPanel ? (
            <section className={UPLOAD_STEP_PANEL}>
              <div className={UPLOAD_STEP_PANEL_BODY}>{main}</div>
              {belowMain ? (
                <div className="border-t border-[#F0EFFF] px-3 py-2 sm:px-4">{belowMain}</div>
              ) : null}
              <div className={UPLOAD_STEP_PANEL_FOOTER}>{footer}</div>
            </section>
          ) : (
            <>
              {main}
              {belowMain}
              {footer}
            </>
          )}
        </div>
        {sidebar}
      </div>
    </div>
  );
}
