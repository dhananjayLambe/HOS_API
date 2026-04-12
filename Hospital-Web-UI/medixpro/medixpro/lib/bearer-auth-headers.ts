/**
 * JWT for raw `fetch` calls — must match keys in `lib/axiosClient.ts` (`access_token`).
 */

export function getBearerAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
