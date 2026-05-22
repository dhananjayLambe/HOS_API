const MOCK_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Phase 1 mock — backend WhatsApp provider still evolving. */
export async function sendTaskWhatsAppMock(_taskId: string): Promise<void> {
  await delay(MOCK_DELAY_MS);
}
