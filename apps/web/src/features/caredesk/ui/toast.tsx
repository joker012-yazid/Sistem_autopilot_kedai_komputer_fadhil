"use client";

// DEPRECATED: Re-export from centralized toast hook.
// Use `import { showToast } from "@/hooks/use-toast"` in new code.

export { showToast, useToast, toast } from "@/hooks/use-toast";
export type { ToastType, ToastOptions } from "@/hooks/use-toast";

// Stub for backward compatibility
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return children;
}

