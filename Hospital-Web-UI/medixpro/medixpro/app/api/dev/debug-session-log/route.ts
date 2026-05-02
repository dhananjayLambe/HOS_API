import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

/**
 * Dev-only sink for `debugSessionLog()` (see lib/debugSessionLog.ts).
 * Appends one NDJSON line per request under `.cursor/debug-bb2dcf.log`.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 204 });
  }
  try {
    const text = await req.text();
    const logDir = path.join(process.cwd(), ".cursor");
    await mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, "debug-bb2dcf.log");
    await appendFile(logFile, `${text}\n`, "utf8");
  } catch {
    // best-effort
  }
  return new NextResponse(null, { status: 204 });
}
