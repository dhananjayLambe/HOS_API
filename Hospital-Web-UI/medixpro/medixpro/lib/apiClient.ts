"use client";

import { useLoadingStore } from "@/store/loadingStore";
import { toast } from "react-hot-toast";

const setGlobalLoading = (value: boolean) =>
  useLoadingStore.getState().setLoading(value);

// export async function apiClient<T>(
//   url: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   setGlobalLoading(true);

//   try {
//     const res = await fetch(url, {
//       ...options,
//       headers: {
//         "Content-Type": "application/json",
//         ...(options.headers || {}),
//       },
//       credentials: "include", // keep cookies/session
//     });

//     if (!res.ok) {
//       let message = "Something went wrong";
//       try {
//         const errorData = await res.json();
//         message = errorData.detail || errorData.message || message;
//       } catch {}
//       toast.error(message);
//       throw new Error(message);
//     }

//     return res.json() as Promise<T>;
//   } catch (err) {
//     console.error("API Error:", err);
//     throw err;
//   } finally {
//     setGlobalLoading(false);
//   }
// }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "APIError"
  }
}

interface RequestOptions extends RequestInit {
  token?: string
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // If sending FormData, let the browser/node set the correct multipart boundary
  const isFormDataBody = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData
  if (isFormDataBody) {
    delete headers["Content-Type"]
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      // Include cookies for same-origin requests to Next.js app routes
      credentials: "include",
    })

    const data = await response.json()

    if (!response.ok) {
      throw new APIError(data.message || data.detail || "An error occurred", response.status, data.errors)
    }

    return data
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError("Network error. Please check your connection.", 0)
  }
}

// Doctor Profile API
export const doctorAPI = {
  // Get doctor profile
  getProfile: (token: string) =>
    apiRequest<any>("/doctor/profile", {
      method: "GET",
      token,
    }),

  // Update personal information
  updatePersonalInfo: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile", {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  // Update address
  updateAddress: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/address", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Education
  addEducation: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/education", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateEducation: (id: string, data: any, token: string) =>
    apiRequest<any>(`/doctor/profile/education?id=${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  deleteEducation: (id: string, token: string) =>
    apiRequest<any>(`/doctor/profile/education?id=${id}`, {
      method: "DELETE",
      token,
    }),

  // Certifications
  addCertification: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/certification", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateCertification: (id: string, data: any, token: string) =>
    apiRequest<any>(`/doctor/profile/certification?id=${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    }),

  deleteCertification: (id: string, token: string) =>
    apiRequest<any>(`/doctor/profile/certification?id=${id}`, {
      method: "DELETE",
      token,
    }),

  // KYC Documents
  uploadKYCDocument: (formData: FormData, token: string) =>
    apiRequest<any>("/doctor/profile/kyc", {
      method: "POST",
      token,
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // Clinic Association
  getClinics: (token: string) =>
    apiRequest<any>("/doctor/profile/clinics", {
      method: "GET",
      token,
    }),

  addClinic: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/clinics", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Fee Structure
  updateFeeStructure: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/fee-structure", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Services
  updateServices: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/services", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Bank Details
  updateBankDetails: (data: any, token: string) =>
    apiRequest<any>("/doctor/profile/bank-details", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Upload profile photo
  uploadPhoto: (formData: FormData, token: string) =>
    apiRequest<any>("/doctor/profile/photo", {
      method: "POST",
      token,
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),
}

export const apiClient = {
  // Personal Information
  updatePersonalInfo: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updatePersonalInfo(data, token)
  },

  // Address
  updateAddress: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updateAddress(data, token)
  },

  // Education
  addEducation: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.addEducation(data, token)
  },

  updateEducation: async (id: string, data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updateEducation(id, data, token)
  },

  deleteEducation: async (id: string) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.deleteEducation(id, token)
  },

  // Certifications
  addCertification: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.addCertification(data, token)
  },

  updateCertification: async (id: string, data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updateCertification(id, data, token)
  },

  deleteCertification: async (id: string) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.deleteCertification(id, token)
  },

  // KYC
  uploadKYCDocument: async (formData: FormData) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.uploadKYCDocument(formData, token)
  },

  // Clinics
  updateClinics: async (clinics: any[]) => {
    const token = localStorage.getItem("authToken") || ""
    // For now, we'll add each clinic individually
    // In production, you might want a bulk update endpoint
    const promises = clinics.map((clinic) => doctorAPI.addClinic(clinic, token))
    return Promise.all(promises)
  },

  // Fee Structure
  updateFeeStructure: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updateFeeStructure(data, token)
  },

  // Services
  updateServices: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updateServices(data, token)
  },

  // Bank Details
  updateBankDetails: async (data: any) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.updateBankDetails(data, token)
  },

  // Profile Photo
  uploadPhoto: async (formData: FormData) => {
    const token = localStorage.getItem("authToken") || ""
    return doctorAPI.uploadPhoto(formData, token)
  },
}