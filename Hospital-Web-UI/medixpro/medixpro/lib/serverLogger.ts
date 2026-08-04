/**
 * Structured server-side logger for Next.js BFF / `app/api` routes.
 * Emits JSON lines via console so production `removeConsole` can keep `error`/`warn`.
 * Never log passwords, tokens, OTP, Authorization headers, or response bodies with PHI.
 */

export type ServerLogMeta = Record<string, string | number | boolean | null | undefined>;

function serializeError(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error) };
}

function emit(
  level: "info" | "warn" | "error",
  message: string,
  error?: unknown,
  meta?: ServerLogMeta,
): void {
  const payload = {
    level,
    message,
    ...(error !== undefined ? { error: serializeError(error) } : {}),
    ...(meta ?? {}),
    ts: new Date().toISOString(),
    service: "medixpro-bff",
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const serverLogger = {
  info(message: string, meta?: ServerLogMeta): void {
    emit("info", message, undefined, meta);
  },
  warn(message: string, meta?: ServerLogMeta): void {
    emit("warn", message, undefined, meta);
  },
  error(message: string, error?: unknown, meta?: ServerLogMeta): void {
    emit("error", message, error, meta);
  },
};
