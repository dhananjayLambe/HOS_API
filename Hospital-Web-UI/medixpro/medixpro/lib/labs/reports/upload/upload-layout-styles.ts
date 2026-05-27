/** Measured height of UploadWorkflowActionBar (py-3 + h-9 buttons). Update when footer content changes. */
export const REPORT_UPLOAD_FOOTER_HEIGHT = "72px";

export const uploadFooterPaddingStyle = {
  paddingBottom: `calc(${REPORT_UPLOAD_FOOTER_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
} as const;

export const UPLOAD_FOOTER_Z_INDEX = "z-[45]";

export const UPLOAD_PAGE_ROOT = "mx-auto flex min-h-0 max-w-6xl flex-col";

export const UPLOAD_CONTENT_GRID =
  "grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_300px]";

export const UPLOAD_MAIN_COLUMN = "min-w-0 space-y-1.5";

export const UPLOAD_LEFT_COLUMN = "w-full self-start";

export const UPLOAD_STEP_PANEL =
  "overflow-hidden rounded-xl border border-[#ECEBFF] bg-white shadow-sm";

export const UPLOAD_STEP_PANEL_BODY = "p-3 sm:p-4";

export const UPLOAD_STEP_PANEL_FOOTER =
  "border-t border-[#ECEBFF] bg-[#FAF9FF] px-3 py-2.5 sm:px-4 sm:py-3";

export const UPLOAD_STEPPER_WRAPPER = "w-full px-0";

export const UPLOAD_FOOTER_INNER =
  "flex w-full flex-col gap-2 sm:flex-row sm:items-center";

export const UPLOAD_FOOTER_LEFT = "flex flex-wrap items-center gap-2";

export const UPLOAD_FOOTER_RIGHT =
  "flex w-full min-w-0 flex-col gap-1.5 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2";
