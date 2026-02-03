"use client";

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8000/api/";

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
        const response = await refreshAxios.post("/api/refresh-token", {
          refresh_token: refreshToken,
        });

        const { tokens } = response.data;
        const newAccessToken = tokens?.access || response.data.access;
        const newRefreshToken = tokens?.refresh || response.data.refresh;

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

// Create a separate axios instance for direct Django backend calls
const backendAxiosClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL.replace(/\/+$/, ""), // Remove trailing slashes
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Auto-attach JWT token for backend calls
backendAxiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // Log the full URL for debugging
    if (config.url) {
      const fullUrl = `${config.baseURL || ""}${config.url}`;
      console.log(`[backendAxiosClient] ${config.method?.toUpperCase()} ${fullUrl}`);
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
    // Log error details for debugging (skip 404s for section endpoints - they're expected for new encounters)
    if (error.config) {
      const fullUrl = `${error.config.baseURL || ""}${error.config.url || ""}`;
      const isSectionEndpoint = fullUrl.includes("/section/");
      const is404 = error.response?.status === 404;
      
      // Only log non-404 errors, or 404s that aren't section endpoints
      if (!is404 || !isSectionEndpoint) {
        console.error(`[backendAxiosClient] Error ${error.response?.status || "Network"} on ${error.config.method?.toUpperCase()} ${fullUrl}`);
        if (error.response?.data && Object.keys(error.response.data).length > 0) {
          console.error("[backendAxiosClient] Error response:", error.response.data);
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
          const response = await refreshAxios.post("/api/refresh-token", {
            refresh_token: refreshToken,
          });
          const { tokens } = response.data;
          const newAccessToken = tokens?.access || response.data.access;
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

