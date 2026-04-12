/** @type {import('next').NextConfig} */
/** Django origin for proxying `/api/consultations|diagnostics|medicines/*` when the browser uses same-origin `/api` (see axiosClient backendAxiosClient). */
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
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-popover', '@radix-ui/react-tabs'],
  },
  // beforeFiles: proxy to Django *before* App Router tries to resolve /api/... (which 404s with HTML).
  // Destination `:path*/` ensures Django receives a trailing slash (APPEND_SLASH). Without it, Next can strip
  // slashes on the client URL while Django redirects to add them → infinite 308/301 loop → axios "Network".
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/consultations/:path*",
          destination: `${backendProxyTarget}/api/consultations/:path*/`,
        },
        {
          source: "/api/diagnostics/:path*",
          destination: `${backendProxyTarget}/api/diagnostics/:path*/`,
        },
        {
          source: "/api/medicines/:path*",
          destination: `${backendProxyTarget}/api/medicines/:path*/`,
        },
      ],
    };
  },
}

export default nextConfig
