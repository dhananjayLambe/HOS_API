import { describe, expect, it } from "vitest";
import { waitingSinceTone, WAITING_AMBER_MINUTES, WAITING_RED_MINUTES } from "@/lib/labs/dashboard/waiting-since";

describe("waitingSinceTone", () => {
  it("uses neutral below amber threshold", () => {
    expect(waitingSinceTone(WAITING_AMBER_MINUTES - 1)).toBe("neutral");
  });

  it("uses amber between thresholds", () => {
    expect(waitingSinceTone(WAITING_AMBER_MINUTES)).toBe("amber");
    expect(waitingSinceTone(WAITING_RED_MINUTES - 1)).toBe("amber");
  });

  it("uses red at and above red threshold", () => {
    expect(waitingSinceTone(WAITING_RED_MINUTES)).toBe("red");
    expect(waitingSinceTone(500)).toBe("red");
  });
});
