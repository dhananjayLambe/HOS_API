import * as React from "react";
import { cn } from "@/lib/utils";
import {
  surfaceInteractive,
  surfacePage,
  surfaceSection,
} from "@/lib/design-system/clinical";

type ClinicalSurfaceVariant = "page" | "section" | "interactive";

const VARIANT_CLASS: Record<ClinicalSurfaceVariant, string> = {
  page: surfacePage,
  section: surfaceSection,
  interactive: surfaceInteractive,
};

export type ClinicalSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: ClinicalSurfaceVariant;
};

export const ClinicalSurface = React.forwardRef<
  HTMLDivElement,
  ClinicalSurfaceProps
>(({ className, variant = "section", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(VARIANT_CLASS[variant], className)}
    {...props}
  />
));
ClinicalSurface.displayName = "ClinicalSurface";
