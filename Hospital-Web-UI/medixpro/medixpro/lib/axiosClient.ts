"use client";

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { extractAuthTokens } from "./auth-token-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
/** Base for Django REST paths. Prefer same-origin `/api/` + Next rewrites (see next.config.mjs) so the browser hits :3000, not :8000. Override with NEXT_PUBLIC_BACKEND_URL for direct-to-Django. */
function resolveBackendBaseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "").trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  return "/api";
}

/** Strip trailing slashes — same as previous behavior for axios baseURL. */
const BACKEND_AXIOS_BASE = resolveBackendBaseUrl().replace(/\/+$/, "");

// Token storage keys
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const ROLE_KEY = "role";

// Create axios instance
const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Auto-attach JWT token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get access token from localStorage
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // If FormData, remove Content-Type header to let browser/axios set it with boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Auto-refresh token on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        // Only redirect to login if we're not already on login page
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/login")) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(ROLE_KEY);
          window.location.href = "/auth/login";
        }
        return Promise.reject(error);
      }

      try {
        // Call refresh token endpoint via Next.js API route (use plain axios to avoid interceptor loop)
        const refreshAxios = axios.create({ baseURL: '' });
        const response = await refreshAxios.post("/api/refresh-token/", {
          refresh_token: refreshToken,
        });

        const parsedTokens = extractAuthTokens(response.data);
        const newAccessToken = parsedTokens.access;
        const newRefreshToken = parsedTokens.refresh;

        // Store new tokens
        if (newAccessToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        // Update role if provided
        if (response.data.role) {
          localStorage.setItem(ROLE_KEY, response.data.role);
        }

        // Update user info if provided in refresh response
        if (response.data.user_id || response.data.username || response.data.first_name || response.data.last_name || response.data.email) {
          if (response.data.user_id) localStorage.setItem("user_id", response.data.user_id);
          if (response.data.username) localStorage.setItem("username", response.data.username);
          if (response.data.first_name) localStorage.setItem("first_name", response.data.first_name);
          if (response.data.last_name) localStorage.setItem("last_name", response.data.last_name);
          if (response.data.email) localStorage.setItem("email", response.data.email);
        }

        // Update Authorization header and retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;

        // Clear tokens and redirect to login (only if not already on login page)
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/login")) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(ROLE_KEY);
          window.location.href = "/auth/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Create a separate axios instance for Django REST (same-origin /api/… + Next rewrites by default)
const backendAxiosClient: AxiosInstance = axios.create({
  baseURL: BACKEND_AXIOS_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Resolved URL the same way axios sends the request (baseURL + path must not be concatenated naively). */
function backendRequestUrl(config: InternalAxiosRequestConfig): string {
  try {
    return backendAxiosClient.getUri(config);
  } catch {
    const base = (config.baseURL || "").replace(/\/+$/, "");
    const path = (config.url || "").replace(/^\/+/, "");
    return path ? `${base}/${path}` : base;
  }
}

// Request interceptor: Auto-attach JWT token for backend calls
backendAxiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors
backendAxiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Aborted requests (e.g. React effect cleanup, strict mode double-mount) have no response — not a real network failure.
    if (axios.isCancel(error) || error.code === AxiosError.ERR_CANCELED) {
      return Promise.reject(error);
    }
    // Log error details for debugging (skip 404s for section/template endpoints - they're expected when not configured)
    if (error.config) {
      const fullUrl = backendRequestUrl(error.config);

      const isSectionEndpoint = fullUrl.includes("/section/");
      const isTemplateEndpoint = fullUrl.includes("/pre-consult/template");
      const isPreviewEndpoint = fullUrl.includes("/pre-consultation/preview/");
      const isConsultationCompleteEndpoint = fullUrl.includes("/consultation/complete/");
      const isInvestigationSuggestionsEndpoint = fullUrl.includes(
        "/diagnostics/investigations/suggestions/",
      );
      /** Optional UI enrichment; investigations section uses static fallback — avoid red logs when Django/proxy is unreachable. */
      const isSuppressedSuggestionsNetwork =
        isInvestigationSuggestionsEndpoint && !error.response;
      const is404 = error.response?.status === 404;
      const isExpectedPreview400 = isPreviewEndpoint && error.response?.status === 400;
      const responseMessage = String((error.response?.data as any)?.message ?? "").toLowerCase();
      const isAlreadyCompleted400 =
        isConsultationCompleteEndpoint &&
        error.response?.status === 400 &&
        (responseMessage.includes("consultation_completed") ||
          responseMessage.includes("current: consultation_completed"));
      if (isExpectedPreview400 && process.env.NODE_ENV !== "production") {
        console.info(
          `[backendAxiosClient] Suppressed expected 400 on ${error.config.method?.toUpperCase()} ${fullUrl}`,
          error.response?.data,
        );
      }
      if (isAlreadyCompleted400 && process.env.NODE_ENV !== "production") {
        console.info(
          `[backendAxiosClient] Suppressed expected already-completed 400 on ${error.config.method?.toUpperCase()} ${fullUrl}`,
          error.response?.data,
        );
      }
      
      // Only log actionable errors:
      // - skip expected 404s on section/template endpoints
      // - skip expected 400s on preview endpoint (e.g. cancelled/no-show encounters)
      // - skip expected already-completed 400 on consultation complete endpoint
      if (
        (!is404 || (!isSectionEndpoint && !isTemplateEndpoint)) &&
        !isExpectedPreview400 &&
        !isAlreadyCompleted400 &&
        !isSuppressedSuggestionsNetwork
      ) {
        console.error(
          `[backendAxiosClient] Error ${error.response?.status || "Network"} on ${error.config.method?.toUpperCase()} ${fullUrl}`,
        );
        if (!error.response) {
          // No HTTP response: Django down, wrong BACKEND_PROXY_TARGET, CORS (if using absolute BACKEND_URL), or timeout
          console.error(
            "[backendAxiosClient] No response — with default same-origin /api, ensure Django is running and Next rewrites match BACKEND_PROXY_TARGET (see next.config.mjs). Or set NEXT_PUBLIC_BACKEND_URL to your API.",
            { code: error.code, message: error.message },
          );
        }
        // Always log response payload if present (even if empty) to avoid losing DRF "detail" messages
        if (error.response) {
          console.error("[backendAxiosClient] Error response statusText:", error.response.statusText);
          console.error("[backendAxiosClient] Error response headers:", error.response.headers);
          console.error("[backendAxiosClient] Error response data:", error.response.data);
        }
      }
    }
    
    // Handle 401 - token refresh (same logic as axiosClient)
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Try to refresh token using the main axiosClient
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          const refreshAxios = axios.create({ baseURL: '' });
          const response = await refreshAxios.post("/api/refresh-token/", {
            refresh_token: refreshToken,
          });
          const parsedTokens = extractAuthTokens(response.data);
          const newAccessToken = parsedTokens.access;
          if (newAccessToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            originalRequest._retry = true;
            return backendAxiosClient(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/login")) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(ROLE_KEY);
            window.location.href = "/auth/login";
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
export { backendAxiosClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY };

