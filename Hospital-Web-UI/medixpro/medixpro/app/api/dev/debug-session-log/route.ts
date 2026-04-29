import { type NextRequest, NextResponse } from "next/server";
import { appendFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

/** Workspace: HOS_API — three levels up from Next app root (medixpro/medixpro). */
function resolveLogFile(): string {
  return join(process.cwd(), "..", "..", "..", ".cursor", "debug-bb2dcf.log");
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  try {
    const text = (await request.text()).trim();
    if (!text) return NextResponse.json({ ok: true });
    const file = resolveLogFile();
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${text}\n`, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
