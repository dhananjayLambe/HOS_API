// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;
  const role = req.cookies.get("role")?.value;
  const { pathname } = req.nextUrl;

  // Public routes
  const publicPaths = [
    "/",
    "/auth/login",
    "/auth/register",
    "/api/verify-otp",
    "/api/send-otp",
    "/api/auth/refresh",
  ];

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // ✅ Redirect logged-in users away from login page or landing page
    if (accessToken && pathname.startsWith("/auth/login")) {
      switch (role) {
        case "doctor":
          return NextResponse.redirect(new URL("/doctor-dashboard", req.url));
        case "helpdesk":
          return NextResponse.redirect(new URL("/helpdesk-dashboard", req.url));
        case "labadmin":
          return NextResponse.redirect(new URL("/lab-dashboard", req.url));
        case "superadmin":
          return NextResponse.redirect(new URL("/admin-dashboard", req.url));
      }
}
    return NextResponse.next();
  }

  // Protected routes: redirect to login if no token
  if (!accessToken) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};