"use client";

import { useLoadingStore } from "@/store/loadingStore";
import { toast } from "react-hot-toast";
import axiosClient from "./axiosClient";
import { AxiosRequestConfig } from "axios";

const setGlobalLoading = (value: boolean) =>
  useLoadingStore.getState().setLoading(value);

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

async function apiRequest<T>(endpoint: string, options: AxiosRequestConfig = {}): Promise<T> {
  // If sending FormData, remove Content-Type header to let browser set it
  const isFormDataBody = typeof FormData !== "undefined" && options.data instanceof FormData
  if (isFormDataBody && options.headers) {
    delete options.headers["Content-Type"]
  }

  try {
    const response = await axiosClient({
      url: endpoint,
      ...options,
      // Headers will be merged by axios
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    return response.data
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const status = error.response.status
      const data = error.response.data || {}
      const message = data.message || data.detail || "An error occurred"
      const apiError = new APIError(message, status, data.errors)
      toast.error(message)
      throw apiError
    } else if (error.request) {
      // Request made but no response
      throw new APIError("Network error. Please check your connection.", 0)
    } else {
      // Error setting up request
      throw new APIError(error.message || "An error occurred", 0)
    }
  }
}

// Doctor Profile API
export const doctorAPI = {
  // Get doctor profile (token auto-attached by axios interceptor)
  getProfile: () =>
    apiRequest<any>("/doctor/profile", {
      method: "GET",
    }),

  // Update personal information
  updatePersonalInfo: (data: any) =>
    apiRequest<any>("/doctor/profile", {
      method: "PATCH",
      data,
    }),

  // Update address
  updateAddress: (data: any) =>
    apiRequest<any>("/doctor/profile/address", {
      method: "POST",
      data,
    }),

  // Education
  addEducation: (data: any) =>
    apiRequest<any>("/doctor/profile/education", {
      method: "POST",
      data,
    }),

  updateEducation: (id: string, data: any) =>
    apiRequest<any>(`/doctor/profile/education?id=${id}`, {
      method: "PATCH",
      data,
    }),

  deleteEducation: (id: string) =>
    apiRequest<any>(`/doctor/profile/education?id=${id}`, {
      method: "DELETE",
    }),

  // Certifications
  addCertification: (data: any) =>
    apiRequest<any>("/doctor/profile/certification", {
      method: "POST",
      data,
    }),

  updateCertification: (id: string, data: any) =>
    apiRequest<any>(`/doctor/profile/certification?id=${id}`, {
      method: "PATCH",
      data,
    }),

  deleteCertification: (id: string) =>
    apiRequest<any>(`/doctor/profile/certification?id=${id}`, {
      method: "DELETE",
    }),

  // KYC Documents
  uploadKYCDocument: (formData: FormData) =>
    apiRequest<any>("/doctor/profile/kyc", {
      method: "POST",
      data: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // Clinic Association
  getClinics: () =>
    apiRequest<any>("/doctor/profile/clinics", {
      method: "GET",
    }),

  addClinic: (data: any) =>
    apiRequest<any>("/doctor/profile/clinics", {
      method: "POST",
      data,
    }),

  // Fee Structure
  updateFeeStructure: (data: any) =>
    apiRequest<any>("/doctor/profile/fee-structure", {
      method: "POST",
      data,
    }),

  // Services
  updateServices: (data: any) =>
    apiRequest<any>("/doctor/profile/services", {
      method: "POST",
      data,
    }),

  // Bank Details
  updateBankDetails: (data: any) =>
    apiRequest<any>("/doctor/profile/bank-details", {
      method: "POST",
      data,
    }),

  // Upload profile photo
  uploadPhoto: (formData: FormData) =>
    apiRequest<any>("/doctor/profile/photo", {
      method: "POST",
      data: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),
}

export const apiClient = {
  // Personal Information
  updatePersonalInfo: async (data: any) => {
    return doctorAPI.updatePersonalInfo(data)
  },

  // Address
  updateAddress: async (data: any) => {
    return doctorAPI.updateAddress(data)
  },

  // Education
  addEducation: async (data: any) => {
    return doctorAPI.addEducation(data)
  },

  updateEducation: async (id: string, data: any) => {
    return doctorAPI.updateEducation(id, data)
  },

  deleteEducation: async (id: string) => {
    return doctorAPI.deleteEducation(id)
  },

  // Certifications
  addCertification: async (data: any) => {
    return doctorAPI.addCertification(data)
  },

  updateCertification: async (id: string, data: any) => {
    return doctorAPI.updateCertification(id, data)
  },

  deleteCertification: async (id: string) => {
    return doctorAPI.deleteCertification(id)
  },

  // KYC
  uploadKYCDocument: async (formData: FormData) => {
    return doctorAPI.uploadKYCDocument(formData)
  },

  // Clinics
  updateClinics: async (clinics: any[]) => {
    // For now, we'll add each clinic individually
    // In production, you might want a bulk update endpoint
    const promises = clinics.map((clinic) => doctorAPI.addClinic(clinic))
    return Promise.all(promises)
  },

  // Fee Structure
  updateFeeStructure: async (data: any) => {
    return doctorAPI.updateFeeStructure(data)
  },

  // Services
  updateServices: async (data: any) => {
    return doctorAPI.updateServices(data)
  },

  // Bank Details
  updateBankDetails: async (data: any) => {
    return doctorAPI.updateBankDetails(data)
  },

  // Profile Photo
  uploadPhoto: async (formData: FormData) => {
    return doctorAPI.uploadPhoto(formData)
  },
}