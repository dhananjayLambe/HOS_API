// lib/fetchWithAuth.ts
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const publicRoutes = ['/', '/api/auth/refresh', '/auth/login', '/auth/register', '/api/verify-otp', '/api/send-otp'];

  // Normalize URL to pathname only
  let pathname: string;
  try {
    pathname = new URL(url, window.location.origin).pathname;
  } catch {
    // If url is already relative
    pathname = url;
  }

  let res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401 && !publicRoutes.includes(pathname)) {
    // Only refresh for protected routes
    const refreshRes = await fetch("/api/refresh-token", {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      // Retry original request
      res = await fetch(url, {
        ...options,
        credentials: "include",
      });
    } else {
      throw new Error("Session expired, please log in again.");
    }
  }

  return res;
}