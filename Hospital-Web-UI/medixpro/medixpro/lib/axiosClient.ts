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

export default axiosClient;
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY };

