import { describe, expect, it } from "vitest";
import { PHASE1_HIDE_MARK_READY_UI, resolveChipAvailableActions } from "@/lib/labs/reports/completion/action-fallback";

describe("resolveChipAvailableActions", () => {
  it("never returns empty when targets exist", () => {
    const actions = resolveChipAvailableActions(undefined, {
      uploadReportId: "r1",
    });
    expect(actions.length).greaterThan(0);
    expect(actions).toContain("UPLOAD_REPORT");
  });

  it("maps MARK_READY to SEND when phase 1 hides mark ready and send target exists", () => {
    expect(PHASE1_HIDE_MARK_READY_UI).toBe(true);
    const actions = resolveChipAvailableActions(["MARK_READY"], {
      sendWhatsappReportId: "r-send",
    });
    expect(actions).not.toContain("MARK_READY");
    expect(actions).toContain("SEND_WHATSAPP");
  });

  it("falls back to VIEW_REPORT when no actions or targets", () => {
    const actions = resolveChipAvailableActions([], {});
    expect(actions).toEqual(["VIEW_REPORT"]);
  });

  it("preserves explicit API actions except hidden MARK_READY", () => {
    const actions = resolveChipAvailableActions(["UPLOAD_REPORT", "SEND_WHATSAPP"], {});
    expect(actions).toContain("UPLOAD_REPORT");
    expect(actions).toContain("SEND_WHATSAPP");
    expect(actions).toContain("VIEW_REPORT");
  });

  it("adds VIEW_REPORT when CORRECT_REPORT is present", () => {
    const actions = resolveChipAvailableActions(["CORRECT_REPORT", "DOWNLOAD_REPORT"], {});
    expect(actions).toContain("CORRECT_REPORT");
    expect(actions).toContain("VIEW_REPORT");
  });
});
