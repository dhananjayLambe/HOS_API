import { describe, expect, it, vi, afterEach } from "vitest";
import { demoQueueProvider } from "@/lib/labs/reports/completion/queue-providers/demo-queue-provider";
import { liveQueueProvider } from "@/lib/labs/reports/completion/queue-providers/live-queue-provider";
import { resolveReportsQueueProvider } from "@/lib/labs/reports/completion/queue-providers/resolve-reports-queue-provider";

describe("resolveReportsQueueProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to live provider with no search params", () => {
    expect(resolveReportsQueueProvider(new URLSearchParams())).toBe(liveQueueProvider);
    expect(resolveReportsQueueProvider(null).mode).toBe("live");
  });

  it("uses demo provider only when demo is forced", () => {
    expect(resolveReportsQueueProvider(new URLSearchParams("demo=1"))).toBe(demoQueueProvider);
  });
});
