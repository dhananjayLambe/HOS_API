import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token");
  const role = req.cookies.get("role")?.value;
  const { pathname } = req.nextUrl;
  console.log("🔍 Path:", pathname, "Role:", role, "AccessToken:", !!accessToken);
  // Public routes (no login needed)
  if (
    pathname === "/" ||pathname.startsWith("/auth/") ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register")||
    pathname.startsWith("/api/verify-otp") ||  // ✅ allow OTP login API
    pathname.startsWith("/api/send-otp")      // ✅ allow sending OTP
  ) {
    return NextResponse.next();
  }

  // If no token → redirect to login
  if (!accessToken) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // ✅ Doctor-only dashboard protection
  if (pathname.startsWith("/(dashboard)") && role !== "doctor") {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
    //   if (pathname.startsWith("/helpdesk-dashboard") && role !== "helpdesk") {
    //     return NextResponse.redirect(new URL("/auth/login", req.url));
    //   }
    //   if (pathname.startsWith("/lab-dashboard") && role !== "labadmin") {
    //     return NextResponse.redirect(new URL("/auth/login", req.url));
    //   }
    //   if (pathname.startsWith("/admin-dashboard") && role !== "superuser") {
    //     return NextResponse.redirect(new URL("/auth/login", req.url));
    //   }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|api).*)", // protect all except Next.js internals & APIs
  ],
};