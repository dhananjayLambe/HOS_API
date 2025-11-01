"use client";

/**
 * Decode JWT token without verification (client-side only)
 * Note: This only decodes the payload, does not verify signature
 */
export function decodeJWT(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  
  // Add 5 minute buffer to avoid edge cases
  return currentTime >= expirationTime - 5 * 60 * 1000;
}

/**
 * Check if JWT token is valid (exists and not expired)
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Get redirect path based on role
 */
export function getRoleRedirectPath(role: string | null): string {
  if (!role) return "/dashboard";
  
  switch (role.toLowerCase()) {
    case "doctor":
      return "/doctor-dashboard";
    case "helpdesk":
      return "/helpdesk-dashboard";
    case "labadmin":
      return "/lab-dashboard";
    case "superuser":
    case "superadmin":
      return "/admin-dashboard";
    default:
      return "/dashboard";
  }
}

