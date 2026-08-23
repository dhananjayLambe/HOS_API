/** @type {import('next').NextConfig} */
/** Django origin for proxying `/api/consultations|diagnostics|medicines|v1/notifications/*` when the browser uses same-origin `/api` (see axiosClient backendAxiosClient). */
const backendProxyTarget = process.env.BACKEND_PROXY_TARGET || "http://127.0.0.1:8000";

const nextConfig = {
  // Align with Django URL patterns (trailing /). Without this, Next 308-strips `/api/.../path/?q` before rewrites;
  // Django then 301-adds the slash → redirect loop → axios "Network" with no response.
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Strip accidental console.log/debug from client bundles in production.
  // Keep error (and warn) for BFF/serverLogger and intentional diagnostics.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-dialog',
      'react-resizable-panels',
    ],
  },
  // beforeFiles: proxy to Django *before* App Router tries to resolve /api/... (which 404s with HTML).
  // Destination `:path*/` ensures Django receives a trailing slash (APPEND_SLASH). Without it, Next can strip
  // slashes on the client URL while Django redirects to add them → infinite 308/301 loop → axios "Network".
  async rewrites() {
    return {
      beforeFiles: [
        // WebSocket + Channels routes live on Django (ASGI), not the Next dev server.
        // Without this, `new WebSocket(`${location.host}/ws/...`)` targets :3000 and will never see queue events.
        {
          source: "/ws/:path*",
          destination: `${backendProxyTarget}/ws/:path*/`,
        },
        // Doctor resources that exist 1:1 on Django. Do not catch-all `/api/doctor/:path*` —
        // that would skip Next BFFs that remap `/profile/education` → `/education/`.
        {
          source: "/api/doctor/profile",
          destination: `${backendProxyTarget}/api/doctor/profile/`,
        },
        {
          source: "/api/doctor/education",
          destination: `${backendProxyTarget}/api/doctor/education/`,
        },
        {
          source: "/api/doctor/education/:path*",
          destination: `${backendProxyTarget}/api/doctor/education/:path*/`,
        },
        {
          source: "/api/doctor/certifications",
          destination: `${backendProxyTarget}/api/doctor/certifications/`,
        },
        {
          source: "/api/doctor/certifications/:path*",
          destination: `${backendProxyTarget}/api/doctor/certifications/:path*/`,
        },
        {
          source: "/api/doctor/specializations",
          destination: `${backendProxyTarget}/api/doctor/specializations/`,
        },
        {
          source: "/api/doctor/specializations/:path*",
          destination: `${backendProxyTarget}/api/doctor/specializations/:path*/`,
        },
        {
          source: "/api/doctor/custom-specializations",
          destination: `${backendProxyTarget}/api/doctor/custom-specializations/`,
        },
        {
          source: "/api/doctor/custom-specializations/:path*",
          destination: `${backendProxyTarget}/api/doctor/custom-specializations/:path*/`,
        },
        {
          source: "/api/doctor/services",
          destination: `${backendProxyTarget}/api/doctor/services/`,
        },
        {
          source: "/api/doctor/services/:path*",
          destination: `${backendProxyTarget}/api/doctor/services/:path*/`,
        },
        {
          source: "/api/doctor/address",
          destination: `${backendProxyTarget}/api/doctor/address/`,
        },
        {
          source: "/api/doctor/bank-details",
          destination: `${backendProxyTarget}/api/doctor/bank-details/`,
        },
        {
          source: "/api/doctor/bank-details/:path*",
          destination: `${backendProxyTarget}/api/doctor/bank-details/:path*/`,
        },
        {
          source: "/api/doctor/upload-photo",
          destination: `${backendProxyTarget}/api/doctor/upload-photo/`,
        },
        {
          source: "/api/doctor/kyc/:path*",
          destination: `${backendProxyTarget}/api/doctor/kyc/:path*/`,
        },
        {
          source: "/api/doctor/government-id",
          destination: `${backendProxyTarget}/api/doctor/government-id/`,
        },
        {
          source: "/api/doctor/registration",
          destination: `${backendProxyTarget}/api/doctor/registration/`,
        },
        {
          source: "/api/doctor/doctor-fees",
          destination: `${backendProxyTarget}/api/doctor/doctor-fees/`,
        },
        {
          source: "/api/doctor/doctor-fees/:path*",
          destination: `${backendProxyTarget}/api/doctor/doctor-fees/:path*/`,
        },
        {
          source: "/api/doctor/follow-up-policies",
          destination: `${backendProxyTarget}/api/doctor/follow-up-policies/`,
        },
        {
          source: "/api/doctor/follow-up-policies/:path*",
          destination: `${backendProxyTarget}/api/doctor/follow-up-policies/:path*/`,
        },
        {
          source: "/api/doctor/cancellation-policies",
          destination: `${backendProxyTarget}/api/doctor/cancellation-policies/`,
        },
        {
          source: "/api/doctor/cancellation-policies/:path*",
          destination: `${backendProxyTarget}/api/doctor/cancellation-policies/:path*/`,
        },
        {
          source: "/api/consultations/:path*",
          destination: `${backendProxyTarget}/api/consultations/:path*/`,
        },
        {
          source: "/api/diagnostics/:path*",
          destination: `${backendProxyTarget}/api/diagnostics/:path*/`,
        },
        {
          source: "/api/v1/doctors/:path*",
          destination: `${backendProxyTarget}/api/v1/doctors/:path*/`,
        },
        {
          source: "/api/v1/diagnostics/:path*",
          destination: `${backendProxyTarget}/api/v1/diagnostics/:path*/`,
        },
        {
          source: "/api/v1/notifications/:path*",
          destination: `${backendProxyTarget}/api/v1/notifications/:path*/`,
        },
        {
          source: "/api/v1/prescriptions/:path*",
          destination: `${backendProxyTarget}/api/v1/prescriptions/:path*/`,
        },
        {
          source: "/api/v1/templates/:path*",
          destination: `${backendProxyTarget}/api/v1/templates/:path*/`,
        },
        {
          source: "/api/v1/visits/:path*",
          destination: `${backendProxyTarget}/api/v1/visits/:path*/`,
        },
        {
          source: "/api/medicines/:path*",
          destination: `${backendProxyTarget}/api/medicines/:path*/`,
        },
        {
          source: "/api/labs/:path*",
          destination: `${backendProxyTarget}/api/labs/:path*/`,
        },
        {
          source: "/api/patients/:path*",
          destination: `${backendProxyTarget}/api/patients/:path*/`,
        },
        {
          source: "/api/patient_account/:path*",
          destination: `${backendProxyTarget}/api/patient_account/:path*/`,
        },
        // Do not catch-all `/api/clinic/:path*` — that skips the Next BFF at
        // app/api/clinic/[id]/route.ts (maps UI `/api/clinic/{id}` → Django `/api/clinic/clinics/{id}/`).
        {
          source: "/api/clinic/clinics/:path*",
          destination: `${backendProxyTarget}/api/clinic/clinics/:path*/`,
        },
        {
          source: "/api/appointments/:path*",
          destination: `${backendProxyTarget}/api/appointments/:path*/`,
        },
        {
          source: "/api/queue/:path*",
          destination: `${backendProxyTarget}/api/queue/:path*/`,
        },
        {
          source: "/api/calendar/:path*",
          destination: `${backendProxyTarget}/api/calendar/:path*/`,
        },
        {
          source: "/api/helpdesk/:path*",
          destination: `${backendProxyTarget}/api/helpdesk/:path*/`,
        },
        {
          source: "/api/admin/:path*",
          destination: `${backendProxyTarget}/api/admin/:path*/`,
        },
        {
          source: "/api/hospital_mgmt/:path*",
          destination: `${backendProxyTarget}/api/hospital_mgmt/:path*/`,
        },
        {
          source: "/api/investigations/:path*",
          destination: `${backendProxyTarget}/api/investigations/:path*/`,
        },
        {
          source: "/api/reports/:path*",
          destination: `${backendProxyTarget}/api/reports/:path*/`,
        },
        // consultation_config only: render-schema. Do not catch-all `/api/consultation/:path*` —
        // that skips Next BFFs that map UI `/api/consultation/instructions/*` → Django
        // `/api/consultations/instructions/*` (plural).
        {
          source: "/api/consultation/render-schema",
          destination: `${backendProxyTarget}/api/consultation/render-schema/`,
        },
        {
          source: "/api/support/:path*",
          destination: `${backendProxyTarget}/api/support/:path*/`,
        },
        {
          source: "/api/tasks/:path*",
          destination: `${backendProxyTarget}/api/tasks/:path*/`,
        },
        {
          source: "/api/notifications/:path*",
          destination: `${backendProxyTarget}/api/notifications/:path*/`,
        },
        {
          source: "/api/auth/:path*",
          destination: `${backendProxyTarget}/api/auth/:path*/`,
        },
      ],
      // Unmatched /api/* (no Next BFF, not listed above) still reaches Django.
      fallback: [
        {
          source: "/api/:path*",
          destination: `${backendProxyTarget}/api/:path*/`,
        },
      ],
    };
  },
}

export default nextConfig
