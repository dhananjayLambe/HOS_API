"use client"

import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import { ToastAction, type ToastActionElement } from "@/components/ui/toast"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"

const DEFAULT_SUCCESS_MS = 3500
const DEFAULT_INFO_MS = 3500
const DEFAULT_WARNING_MS = 4000
const DEFAULT_ERROR_MS = 5000
/** Toasts with an action (e.g. Undo) stay visible longer. */
const DEFAULT_WITH_ACTION_MS = 7000

export type ToastNotificationOptions = {
  duration?: number
  action?: { label: string; onClick: () => void }
}

function buildAction(
  action: ToastNotificationOptions["action"]
): ToastActionElement | undefined {
  if (!action) return undefined
  return React.createElement(
    ToastAction,
    { altText: action.label, onClick: action.onClick },
    action.label
  ) as unknown as ToastActionElement
}

export function useToastNotification() {
  const { toast } = useToast()

  return {
    success: (message: string, options?: ToastNotificationOptions) => {
      const hasAction = Boolean(options?.action)
      toast({
        title: "Success",
        description: message,
        variant: "success",
        duration: options?.duration ?? (hasAction ? DEFAULT_WITH_ACTION_MS : DEFAULT_SUCCESS_MS),
        icon: React.createElement(CheckCircle2, {
          className: "h-5 w-5 text-green-600 dark:text-green-400",
        }),
        action: buildAction(options?.action),
      })
    },
    error: (message: string, options?: ToastNotificationOptions) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
        duration: options?.duration ?? DEFAULT_ERROR_MS,
        icon: React.createElement(XCircle, {
          className: "h-5 w-5 text-red-600 dark:text-red-400",
        }),
        action: buildAction(options?.action),
      })
    },
    info: (message: string, options?: ToastNotificationOptions) => {
      toast({
        title: "Info",
        description: message,
        duration: options?.duration ?? DEFAULT_INFO_MS,
        icon: React.createElement(Info, {
          className: "h-5 w-5 text-blue-600 dark:text-blue-400",
        }),
        action: buildAction(options?.action),
      })
    },
    warning: (message: string, options?: ToastNotificationOptions) => {
      toast({
        title: "Warning",
        description: message,
        variant: "warning",
        duration: options?.duration ?? DEFAULT_WARNING_MS,
        icon: React.createElement(AlertTriangle, {
          className: "h-5 w-5 text-amber-600 dark:text-amber-400",
        }),
        action: buildAction(options?.action),
      })
    },
  }
}
