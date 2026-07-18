/**
 * Print a resolved workspace artifact (PDF blob/remote, image, or text).
 * Uses a hidden iframe and waits for load — popup+immediate print fails for blob PDFs.
 */

import type { ArtifactKind } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";

export async function printResolvedWorkspaceUrl(
  url: string,
  kind: ArtifactKind
): Promise<void> {
  if (kind === "IMAGE") {
    await printImage(url);
    return;
  }
  if (kind === "CSV" || kind === "TXT") {
    await printText(url);
    return;
  }
  await printDocument(url);
}

function printDocument(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Print report");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      window.setTimeout(() => {
        iframe.remove();
      }, 60_000);
      if (err) reject(err);
      else resolve();
    };

    const triggerPrint = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          finish(new Error("Print frame unavailable."));
          return;
        }
        win.focus();
        win.print();
        finish();
      } catch (e) {
        finish(e instanceof Error ? e : new Error("Print failed."));
      }
    };

    iframe.onload = () => {
      window.setTimeout(triggerPrint, 300);
    };

    const fallbackTimer = window.setTimeout(triggerPrint, 1500);

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}

async function printText(url: string): Promise<void> {
  const res = await fetch(url);
  const text = await res.text();
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    throw new Error("Pop-up blocked. Allow pop-ups to print.");
  }
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  w.document.write(
    `<!DOCTYPE html><html><head><title>Print</title></head>` +
      `<body style="margin:16px;font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap">` +
      `${escaped}</body></html>`
  );
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 150);
}

function printImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      reject(new Error("Pop-up blocked. Allow pop-ups to print."));
      return;
    }
    w.document.write(
      `<!DOCTYPE html><html><head><title>Print</title></head>` +
        `<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff">` +
        `<img id="print-img" src="${url}" style="max-width:100%;height:auto" />` +
        `</body></html>`
    );
    w.document.close();
    const img = w.document.getElementById("print-img") as HTMLImageElement | null;
    const doPrint = () => {
      try {
        w.focus();
        w.print();
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Print failed."));
      }
    };
    if (img) {
      if (img.complete) {
        window.setTimeout(doPrint, 100);
      } else {
        img.onload = () => window.setTimeout(doPrint, 100);
        img.onerror = () => reject(new Error("Image failed to load for print."));
      }
    } else {
      window.setTimeout(doPrint, 200);
    }
  });
}
