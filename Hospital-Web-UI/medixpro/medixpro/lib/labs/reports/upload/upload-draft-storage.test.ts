import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearUploadDraft,
  draftNeedsFileReselect,
  loadUploadDraft,
  saveUploadDraft,
  type UploadDraftV1,
} from "@/lib/labs/reports/upload/upload-draft-storage";

describe("upload-draft-storage", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    Object.keys(store).forEach((k) => delete store[k]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const draft: UploadDraftV1 = {
    version: 1,
    savedAt: new Date().toISOString(),
    taskId: "t1",
    filesMeta: [{ id: "f1", name: "a.pdf", size: 100, type: "application/pdf" }],
    primaryFileId: "f1",
    verified: false,
  };

  it("saves and loads v1 draft", () => {
    saveUploadDraft(draft);
    expect(loadUploadDraft("t1")?.filesMeta).toHaveLength(1);
  });

  it("migrates legacy draft key", () => {
    store["lab-report-draft:t2"] = JSON.stringify({
      taskId: "t2",
      savedAt: new Date().toISOString(),
      files: [{ id: "x", name: "b.pdf", size: 1, type: "application/pdf" }],
      primaryFileId: "x",
      verified: true,
    });
    const loaded = loadUploadDraft("t2");
    expect(loaded?.version).toBe(1);
    expect(loaded?.filesMeta[0]?.name).toBe("b.pdf");
  });

  it("expires stale draft", () => {
    const stale: UploadDraftV1 = {
      ...draft,
      taskId: "stale",
      savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };
    saveUploadDraft(stale);
    expect(loadUploadDraft("stale")).toBeNull();
  });

  it("draftNeedsFileReselect when metadata without files", () => {
    expect(draftNeedsFileReselect(draft, 0)).toBe(true);
    expect(draftNeedsFileReselect(draft, 1)).toBe(false);
  });

  it("clear removes draft", () => {
    saveUploadDraft(draft);
    clearUploadDraft("t1");
    expect(loadUploadDraft("t1")).toBeNull();
  });
});
