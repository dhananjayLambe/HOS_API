// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes (no auth required)
  const publicPaths = [
    "/",
    "/auth/login",
    "/auth/register",
    "/api/verify-otp",
    "/api/send-otp",
    "/api/login",
    "/api/resend-otp",
    "/api/refresh-token",
    "/api/logout",
    "/api/auth/refresh",
    "/api/doctor/onboarding/phase1",
    "/api/auth/check-user-status/",
    "/api/clinic/clinics/onboarding/",
    "/auth/register/clinic-registration",
    "/api/lab-admin/onboarding/"
  ];

  // All public paths are allowed
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // For protected routes, let the frontend handle auth checks
  // The frontend will redirect to login if needed
  // We don't check tokens here since middleware runs on server and can't access localStorage
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};