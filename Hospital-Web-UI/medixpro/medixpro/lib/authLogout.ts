"use client";

import axios from "axios";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY } from "./axiosClient";
import { resetHelpdeskQueueStoreState } from "./helpdeskQueueStore";

const USER_INFO_KEYS = ["user_id", "username", "first_name", "last_name", "email"] as const;

/** Dispatched before redirect so LabDashboardProviders can drop React Query lab-session cache. */
export const AUTH_LOGOUT_EVENT = "hos:auth-logout";

export function dispatchAuthLogoutEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
}

export function clearClientAuthStorage(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  for (const key of USER_INFO_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem("username");
  localStorage.removeItem("user");

  resetHelpdeskQueueStoreState();
  dispatchAuthLogoutEvent();
}

/** Best-effort refresh blacklist via Next.js BFF (no axios interceptors). */
export async function blacklistRefreshToken(): Promise<void> {
  if (typeof window === "undefined") return;

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return;

  try {
    const refreshAxios = axios.create({ baseURL: "" });
    await refreshAxios.post("/api/logout", { refresh_token: refreshToken });
  } catch (err) {
    console.error("Logout API failed", err);
  }
}

export type ForceLogoutOptions = {
  /** Call Django logout to blacklist refresh token (default true). */
  blacklist?: boolean;
};

/**
 * Full client sign-out: optional backend blacklist, clear storage, lab-session cache event.
 * Caller handles navigation (router.replace or window.location).
 */
export async function performClientLogout(options: ForceLogoutOptions = {}): Promise<void> {
  const { blacklist = true } = options;

  if (blacklist) {
    await blacklistRefreshToken();
  }

  clearClientAuthStorage();
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth/login")) return;
  window.location.href = "/auth/login";
}

/** Used by axios interceptors when refresh fails (no React router). */
export async function forceLogoutAndRedirect(): Promise<void> {
  await performClientLogout({ blacklist: true });
  redirectToLogin();
}
