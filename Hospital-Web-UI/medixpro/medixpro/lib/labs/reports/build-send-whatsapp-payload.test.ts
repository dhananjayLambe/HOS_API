import { buildSendWhatsAppPayload } from "@/lib/labs/reports/build-send-whatsapp-payload";
import { describe, expect, it } from "vitest";

describe("buildSendWhatsAppPayload", () => {
  it("accepts formatted phone numbers", () => {
    const result = buildSendWhatsAppPayload("+91 98765 43210");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.recipient_phone).toBe("+91 98765 43210");
      expect(result.payload.channel).toBe("WHATSAPP");
    }
  });

  it("rejects missing phone", () => {
    expect(buildSendWhatsAppPayload("")).toEqual({
      ok: false,
      error: "Patient phone is required to send the report.",
    });
  });

  it("rejects too few digits", () => {
    expect(buildSendWhatsAppPayload("12345").ok).toBe(false);
  });
});
