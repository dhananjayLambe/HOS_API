import {
  buildPendingWorkSummary,
  buildTestWorkflows,
  inferArtifactType,
  isReportSent,
  summarizeTestWorkflows,
  workflowActionsFromApiActions,
} from "@/lib/labs/reports/completion/operational-contract";
import type { ReportArtifactViewModel, ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { describe, expect, it } from "vitest";

function chip(
  reportId: string,
  testLabel: string,
  status: ReportChipViewModel["status"],
  deliveryState: ReportChipViewModel["deliveryState"] = status === "sent" ? "sent" : "not_sent",
  options: Partial<ReportChipViewModel> = {},
): ReportChipViewModel {
  return { reportId, testLabel, status, deliveryState, artifacts: [], versions: [], ...options };
}

function artifact(id: string, fileName = "report.pdf"): ReportArtifactViewModel {
  return {
    id,
    fileName,
    mimeType: fileName.endsWith(".csv") ? "text/csv" : "application/pdf",
    artifactType: fileName.endsWith(".csv") ? "RAW_MACHINE_DATA" : "PRIMARY_REPORT",
    patientVisible: !fileName.endsWith(".csv"),
  };
}

describe("operational contract helpers", () => {
  it("summarizes pending work in operator language", () => {
    expect(buildPendingWorkSummary([chip("1", "CBC", "pending")])).toBe("1 report still pending");
    expect(buildPendingWorkSummary([chip("1", "CBC", "pending"), chip("2", "LFT", "pending")])).toBe("2 reports pending");
    expect(buildPendingWorkSummary([chip("1", "CBC", "ready"), chip("2", "LFT", "ready")])).toBe("All reports uploaded");
  });

  it("keeps sent distinct from ready", () => {
    expect(isReportSent(chip("1", "CBC", "ready"))).toBe(false);
    expect(isReportSent(chip("1", "CBC", "sent", "sent"))).toBe(true);
  });

  it("defaults artifact ownership by file type", () => {
    expect(inferArtifactType("cbc.pdf", "application/pdf")).toBe("PRIMARY_REPORT");
    expect(inferArtifactType("machine.csv", "text/csv")).toBe("RAW_MACHINE_DATA");
    expect(inferArtifactType("support.zip", "application/zip")).toBe("SUPPORTING_FILE");
  });

  it("adapts report chips into independent test workflow rows", () => {
    const workflows = buildTestWorkflows([
      chip("cbc", "CBC", "ready", "not_sent", { artifacts: [artifact("a1")] }),
      chip("abpm", "ABPM", "pending"),
      chip("culture", "Culture", "pending"),
      chip("failed", "LFT", "failed", "failed", { artifacts: [artifact("a2")] }),
    ]);

    expect(workflows.map((workflow) => workflow.reportId)).toEqual(["cbc", "abpm", "culture", "failed"]);
    expect(workflows[0]!.availableActions).toEqual(["VIEW", "SEND"]);
    expect(workflows[1]!.availableActions).toEqual(["UPLOAD"]);
    expect(workflows[2]!.availableActions).toEqual(["UPLOAD"]);
    expect(workflows[3]!.availableActions).toEqual(["VIEW", "RETRY"]);
    expect(workflows[0]!.timeline.map((event) => event.label)).toEqual(["Collected", "Report uploaded"]);
    expect(workflows[3]!.timeline.map((event) => event.label)).toEqual(["Collected", "Report uploaded", "Delivery failed"]);
  });

  it("maps CORRECT_REPORT from API to re-upload workflow action", () => {
    expect(workflowActionsFromApiActions(["CORRECT_REPORT", "VIEW_REPORT"])).toEqual(["REUPLOAD", "VIEW"]);
  });

  it("offers preview and re-upload for sent reports without local artifacts", () => {
    const workflows = buildTestWorkflows([
      chip("sent", "CBC", "sent", "sent", { availableActions: ["CORRECT_REPORT", "VIEW_REPORT"] }),
    ]);
    expect(workflows[0]!.availableActions).toEqual(["VIEW", "REUPLOAD"]);
  });

  it("treats delivered delivery as sent even when line status is still ready", () => {
    const workflows = buildTestWorkflows([chip("ready-delivered", "LFT", "ready", "delivered")]);
    expect(workflows[0]!.availableActions).toEqual(["VIEW", "REUPLOAD"]);
  });

  it("prioritizes quick preview actions for delivered and re-uploaded reports", () => {
    const workflows = buildTestWorkflows([
      chip("sent", "CBC", "sent", "sent", { artifacts: [artifact("sent-art")] }),
      chip("updated", "LFT", "ready", "not_sent", { artifacts: [artifact("updated-art")], isReuploaded: true }),
      chip("updated-sent", "KFT", "sent", "sent", { artifacts: [artifact("updated-sent-art")], isReuploaded: true }),
    ]);

    expect(workflows[0]!.availableActions).toEqual(["VIEW", "REUPLOAD"]);
    expect(workflows[1]!.availableActions).toEqual(["VIEW", "SEND"]);
    expect(workflows[1]!.isReuploaded).toBe(true);
    expect(workflows[1]!.timeline.map((event) => event.label)).toEqual(["Collected", "Report re-uploaded"]);
    expect(workflows[2]!.availableActions).toEqual(["VIEW", "REUPLOAD"]);
  });

  it("summarizes order state from child test workflows only", () => {
    const workflows = buildTestWorkflows([
      chip("pending", "CBC", "pending"),
      chip("ready", "Lipid", "ready"),
      chip("sent", "Thyroid", "sent", "sent"),
      chip("failed", "ABPM", "failed", "failed"),
    ]);

    expect(summarizeTestWorkflows(workflows)).toMatchObject({
      pending: 1,
      ready: 1,
      delivered: 1,
      failed: 1,
    });
  });
});
