export type SendWhatsAppPayload = {
  recipient_phone: string;
  channel?: string;
};

export type SendWhatsAppPayloadResult =
  | { ok: true; payload: SendWhatsAppPayload }
  | { ok: false; error: string };

/** Builds POST body for `send-whatsapp/` from queue/task patient phone. */
export function buildSendWhatsAppPayload(
  patientPhone: string | null | undefined,
): SendWhatsAppPayloadResult {
  const recipient_phone = (patientPhone ?? "").trim();
  if (!recipient_phone) {
    return { ok: false, error: "Patient phone is required to send the report." };
  }
  const digits = recipient_phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return { ok: false, error: "Patient phone must have 10–15 digits." };
  }
  return { ok: true, payload: { recipient_phone, channel: "WHATSAPP" } };
}
