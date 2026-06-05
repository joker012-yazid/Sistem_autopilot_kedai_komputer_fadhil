"use client"

import { toast } from "sonner"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function showToast({ message, type = "info", duration = 4000, action }: ToastOptions) {
  switch (type) {
    case "success":
      toast.success(message, { duration, action })
      break
    case "error":
      toast.error(message, { duration, action })
      break
    case "warning":
      toast.warning(message, { duration, action })
      break
    case "info":
    default:
      toast(message, { duration, action })
      break
  }
}

export function useToast() {
  return { showToast }
}

export { toast }

