import { describe, expect, it } from "vitest";
import {
  REPORT_UPLOAD_FOOTER_HEIGHT,
  uploadFooterPaddingStyle,
  UPLOAD_FOOTER_Z_INDEX,
} from "@/lib/labs/reports/upload/upload-layout-styles";

describe("upload-layout-styles", () => {
  it("exports footer height constant", () => {
    expect(REPORT_UPLOAD_FOOTER_HEIGHT).toBe("72px");
  });

  it("footer padding uses height constant and safe-area", () => {
    expect(uploadFooterPaddingStyle.paddingBottom).toContain(REPORT_UPLOAD_FOOTER_HEIGHT);
    expect(uploadFooterPaddingStyle.paddingBottom).toContain("safe-area-inset-bottom");
  });

  it("footer z-index is above shell header", () => {
    expect(UPLOAD_FOOTER_Z_INDEX).toBe("z-[45]");
  });
});
