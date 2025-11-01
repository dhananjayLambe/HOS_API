// lib/fetchWithAuth.ts
// Deprecated: Use axiosClient instead which handles auth automatically
// This file is kept for backward compatibility but should be migrated to axiosClient

import axiosClient from "./axiosClient";
import { AxiosRequestConfig } from "axios";

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

  // Convert fetch options to axios config
  const axiosConfig: AxiosRequestConfig = {
    url: pathname.startsWith('/') ? pathname : url,
    method: (options.method as any) || 'GET',
    data: options.body,
    headers: options.headers as any,
  };

  try {
    // Use axios client which handles auth automatically
    const response = await axiosClient(axiosConfig);
    
    // Convert axios response to fetch-like Response
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers as any),
    });
  } catch (error: any) {
    // Handle 401 errors - axios interceptor already handles refresh
    if (error.response?.status === 401 && !publicRoutes.includes(pathname)) {
      throw new Error("Session expired, please log in again.");
    }
    throw error;
  }
}