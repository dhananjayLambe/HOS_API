/**
 * Absolute base URL for server-side Next.js Route Handlers that proxy to Django (`/api/...` on Django).
 *
 * **Browser** can use `NEXT_PUBLIC_API_URL=/api` (same-origin to Next).
 * **This function is for Node `fetch` only** — relative bases like `/api` break or concatenate
 * incorrectly with paths like `patients/search/`.
 *
 * Resolution order:
 * 1. `DJANGO_API_URL` — preferred (e.g. `http://127.0.0.1:8000/api/`)
 * 2. `BACKEND_PROXY_TARGET` + `/api/` — matches [next.config.mjs](mdc:next.config.mjs) default (`http://127.0.0.1:8000`)
 * 3. `NEXT_PUBLIC_API_URL` — only if it is an absolute URL (`http://` or `https://`)
 * 4. Fallback `http://127.0.0.1:8000/api/`
 */
export function getDjangoApiBase(): string {
  const trim = (s: string) => s.trim();
  // Bracket access so Next does not inline these as undefined at image build.
  const django = trim(process.env["DJANGO_API_URL"] || "");
  if (django) {
    return ensureTrailingSlashAfterOrigin(django);
  }

  const proxy = trim(
    process.env["BACKEND_PROXY_TARGET"] || process.env["BACKEND_URL"] || "",
  );
  if (proxy) {
    const origin = proxy.replace(/\/+$/, "").replace(/\/api$/, "");
    return `${origin}/api/`;
  }

  const pub = trim(process.env["NEXT_PUBLIC_API_URL"] || "");
  if (pub.startsWith("http://") || pub.startsWith("https://")) {
    return ensureTrailingSlashAfterOrigin(pub);
  }

  // 127.0.0.1, not localhost: Node resolves localhost to ::1 first, and
  // Colima/Docker often only forwards IPv4 :8000 → fetch failed / ECONNREFUSED.
  return "http://127.0.0.1:8000/api/";
}

/** Ensures the returned string ends with exactly one `/` (Django paths are appended without a leading slash). */
function ensureTrailingSlashAfterOrigin(base: string): string {
  return `${base.replace(/\/+$/, "")}/`;
}
