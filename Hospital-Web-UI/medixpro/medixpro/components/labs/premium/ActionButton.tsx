"use client";

import { labBtnDanger, labBtnPrimary, labBtnSecondary } from "@/components/labs/labDesignTokens";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ActionButton({ variant = "primary", className, children, type = "button", ...props }: ActionButtonProps) {
  const styles =
    variant === "primary" ? labBtnPrimary : variant === "danger" ? labBtnDanger : labBtnSecondary;
  return (
    <button type={type} className={cn(styles, className)} {...props}>
      {children}
    </button>
  );
}
