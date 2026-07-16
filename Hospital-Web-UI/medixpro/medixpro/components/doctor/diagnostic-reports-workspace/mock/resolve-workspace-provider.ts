import { createDemoWorkspaceProvider } from "@/components/doctor/diagnostic-reports-workspace/mock/workspace-demo-provider";
import { createLiveWorkspaceProvider } from "@/components/doctor/diagnostic-reports-workspace/mock/live-workspace-provider";
import type { DiagnosticReportsWorkspaceProvider } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

let demoSingleton: DiagnosticReportsWorkspaceProvider | null = null;

export function isWorkspaceDemoForced(
  searchParams?: URLSearchParams | { get: (k: string) => string | null }
): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DIAGNOSTIC_REPORTS_DEMO === "true") {
    return true;
  }
  if (!searchParams) return true; // Phase 1 default: demo
  const demo = searchParams.get("demo");
  if (demo === "0" || demo === "false") return false;
  return true;
}

export function resolveWorkspaceProvider(options?: {
  demo?: boolean;
}): DiagnosticReportsWorkspaceProvider {
  const useDemo = options?.demo !== false;
  if (useDemo) {
    if (!demoSingleton) demoSingleton = createDemoWorkspaceProvider();
    return demoSingleton;
  }
  return createLiveWorkspaceProvider();
}

/** Test helper — reset mutable demo store between tests. */
export function resetDemoWorkspaceProvider(): void {
  demoSingleton = null;
}
