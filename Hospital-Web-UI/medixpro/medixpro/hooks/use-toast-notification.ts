"use client"

import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle } from "lucide-react"

export function useToastNotification() {
  const { toast } = useToast()

  return {
    success: (message: string, options?: { duration?: number }) => {
      toast({
        title: "Success",
        description: message,
        variant: "success",
        duration: options?.duration ?? 2500, // Default 2.5 seconds
        icon: React.createElement(CheckCircle2, { 
          className: "h-5 w-5 text-green-600 dark:text-green-400" 
        }),
      })
    },
    error: (message: string, options?: { duration?: number }) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
        duration: options?.duration ?? 5000, // Default 5 seconds for errors
        icon: React.createElement(XCircle, { 
          className: "h-5 w-5 text-red-600 dark:text-red-400" 
        }),
      })
    },
    info: (message: string, options?: { duration?: number }) => {
      toast({
        title: "Info",
        description: message,
        duration: options?.duration ?? 3000,
      })
    },
  }
}
