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
  // If sending FormData, remove Content-Type header to let axios/browser set it automatically
  const isFormDataBody = typeof FormData !== "undefined" && options.data instanceof FormData
  
  // Log request details for digital signature uploads
  if (endpoint.includes("digital-signature")) {
    console.log("[apiRequest] Digital signature upload request")
    console.log("[apiRequest] Endpoint:", endpoint)
    console.log("[apiRequest] Method:", options.method || "GET")
    console.log("[apiRequest] Is FormData:", isFormDataBody)
  }
  
  // Prepare headers
  const headers: Record<string, any> = {}
  
  if (!isFormDataBody) {
    // Only set Content-Type for non-FormData requests
    headers["Content-Type"] = "application/json"
  }
  // For FormData, don't set Content-Type - axios will automatically set multipart/form-data with boundary
  
  // Merge with provided headers
  if (options.headers) {
    Object.assign(headers, options.headers)
  }
  
  // If FormData, explicitly remove Content-Type if it was set
  if (isFormDataBody) {
    delete headers["Content-Type"]
    delete headers["content-type"]
  }

  if (endpoint.includes("digital-signature")) {
    console.log("[apiRequest] Final headers:", headers)
  }

  try {
    const config: AxiosRequestConfig = {
      url: endpoint,
      ...options,
      headers,
    }
    
    // For FormData, ensure axios doesn't transform the data
    if (isFormDataBody) {
      config.transformRequest = [(data) => data] // Don't transform FormData
    }
    
    if (endpoint.includes("digital-signature")) {
      console.log("[apiRequest] Making request to:", endpoint)
      console.log("[apiRequest] Request config:", {
        method: config.method,
        url: config.url,
        hasData: !!config.data,
        isFormData: config.data instanceof FormData
      })
    }
    
    const response = await axiosClient(config)

    if (endpoint.includes("digital-signature")) {
      console.log("[apiRequest] Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      })
    }

    return response.data
  } catch (error: any) {
    if (error.response) {
      // Server responded with error
      const status = error.response.status
      const data = error.response.data || {}
      
      // Log full error for debugging
      console.error(`[API Error] ${endpoint}:`, {
        status,
        data,
        headers: error.response.headers,
      })
      
      // Try multiple ways to extract error message
      let message = "An error occurred"
      if (data.detail) {
        message = data.detail
      } else if (data.message) {
        message = data.message
      } else if (data.error) {
        message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
      } else if (typeof data === 'string') {
        message = data
      } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        message = data.non_field_errors[0]
      } else if (Object.keys(data).length > 0) {
        // Get first error from validation errors
        const firstKey = Object.keys(data)[0]
        const firstError = data[firstKey]
        message = Array.isArray(firstError) ? `${firstKey}: ${firstError[0]}` : `${firstKey}: ${firstError}`
      }
      
      const apiError = new APIError(message, status, data.errors || data)
      
      // Don't show toast for 401/403/404 (auth/not found errors), rate limiting, or photo uploads - let components handle them
      const isSilentError = status === 401 || 
                           status === 403 || 
                           status === 404 ||
                           endpoint?.includes("/photo") ||
                           message.toLowerCase().includes("throttled") ||
                           message.toLowerCase().includes("rate limit")
      
      if (!isSilentError) {
        // Only show toast for unexpected errors
        toast.error(message)
      }
      
      throw apiError
    } else if (error.request) {
      // Request made but no response
      const networkError = new APIError("Network error. Please check your connection.", 0)
      // Don't show toast for network errors in profile loading - let components handle
      if (!endpoint?.includes("/doctor/profile")) {
        toast.error("Network error. Please check your connection.")
      }
      throw networkError
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

  // Get address
  getAddress: () =>
    apiRequest<any>("/doctor/address", {
      method: "GET",
    }),

  // Update or create address (handles both create and update)
  updateAddress: async (data: any) => {
    try {
      // First try to get existing address
      const existing = await apiRequest<any>("/doctor/address", {
        method: "GET",
      })
      
      // If address exists, update it using PATCH (partial_update doesn't require pk)
      if (existing?.status === "success" && existing?.data) {
        return apiRequest<any>("/doctor/address", {
          method: "PATCH",
          data,
        })
      }
    } catch (error: any) {
      // If address doesn't exist (404), create it using POST
      if (error?.status === 404 || error?.response?.status === 404) {
        return apiRequest<any>("/doctor/address", {
          method: "POST",
          data,
        })
      }
      throw error
    }
    
    // Fallback: try POST (create)
    return apiRequest<any>("/doctor/address", {
      method: "POST",
      data,
    })
  },

  // Education
  getEducation: () =>
    apiRequest<any>("/doctor/profile/education", {
      method: "GET",
    }),

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
  getCertifications: () =>
    apiRequest<any>("/doctor/profile/certification", {
      method: "GET",
    }),

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

  // Specializations
  getSpecializations: () =>
    apiRequest<any>("/doctor/specializations", {
      method: "GET",
    }),

  addSpecialization: (data: any) =>
    apiRequest<any>("/doctor/specializations", {
      method: "POST",
      data,
    }),

  updateSpecialization: (id: string, data: any) =>
    apiRequest<any>(`/doctor/specializations?id=${id}`, {
      method: "PATCH",
      data,
    }),

  deleteSpecialization: (id: string) =>
    apiRequest<any>(`/doctor/specializations?id=${id}`, {
      method: "DELETE",
    }),

  // Custom Specializations
  getCustomSpecializations: () =>
    apiRequest<any>("/doctor/custom-specializations", {
      method: "GET",
    }),

  createCustomSpecialization: (data: any) =>
    apiRequest<any>("/doctor/custom-specializations", {
      method: "POST",
      data,
    }),

  // Government ID (KYC)
  getGovernmentID: () =>
    apiRequest<any>("/doctor/government-id", {
      method: "GET",
    }),

  createGovernmentID: (data: any) =>
    apiRequest<any>("/doctor/government-id", {
      method: "POST",
      data,
    }),

  updateGovernmentID: (data: any) =>
    apiRequest<any>("/doctor/government-id", {
      method: "PATCH",
      data,
    }),

  deleteGovernmentID: () =>
    apiRequest<any>("/doctor/government-id", {
      method: "DELETE",
    }),

  uploadGovernmentIDFiles: (formData: FormData) =>
    apiRequest<any>("/doctor/government-id/upload", {
      method: "PATCH",
      data: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // Registration (Medical Registration)
  getRegistration: () =>
    apiRequest<any>("/doctor/registration", {
      method: "GET",
    }),

  createRegistration: (data: any) =>
    apiRequest<any>("/doctor/registration", {
      method: "POST",
      data,
    }),

  updateRegistration: (data: any) =>
    apiRequest<any>("/doctor/registration", {
      method: "PATCH",
      data,
    }),

  deleteRegistration: () =>
    apiRequest<any>("/doctor/registration", {
      method: "DELETE",
    }),

  uploadRegistrationCertificate: (formData: FormData) =>
    apiRequest<any>("/doctor/registration/upload", {
      method: "PATCH",
      data: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // KYC Status
  getKYCStatus: () =>
    apiRequest<any>("/doctor/kyc/status", {
      method: "GET",
    }),

  uploadDigitalSignature: (formData: FormData) => {
    console.log("[API Client] uploadDigitalSignature called")
    console.log("[API Client] Endpoint: /doctor/kyc/upload/digital-signature")
    console.log("[API Client] Method: PATCH")
    console.log("[API Client] FormData entries:")
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`[API Client]   ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
      } else {
        console.log(`[API Client]   ${key}: ${value}`)
      }
    }
    return apiRequest<any>("/doctor/kyc/upload/digital-signature", {
      method: "PATCH",
      data: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  },

  // KYC Documents (legacy - kept for backward compatibility)
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
      method: "POST", // Next.js route handles PATCH conversion to Django
      data: formData,
      headers: {
        // Explicitly don't set Content-Type - let browser/axios set it automatically for FormData
        // Axios will automatically set multipart/form-data with boundary when it sees FormData
      },
    }),
}

export const apiClient = {
  // Personal Information
  updatePersonalInfo: async (data: any) => {
    return doctorAPI.updatePersonalInfo(data)
  },

  // Profile
  getProfile: async () => {
    return doctorAPI.getProfile()
  },

  // Address
  updateAddress: async (data: any) => {
    return doctorAPI.updateAddress(data)
  },

  // Education
  addEducation: async (data: any) => {
    return doctorAPI.addEducation(data)
  },

  getEducation: async () => {
    return doctorAPI.getEducation()
  },

  updateEducation: async (id: string, data: any) => {
    return doctorAPI.updateEducation(id, data)
  },

  deleteEducation: async (id: string) => {
    return doctorAPI.deleteEducation(id)
  },

  // Certifications
  getCertifications: async () => {
    return doctorAPI.getCertifications()
  },

  addCertification: async (data: any) => {
    return doctorAPI.addCertification(data)
  },

  updateCertification: async (id: string, data: any) => {
    return doctorAPI.updateCertification(id, data)
  },

  deleteCertification: async (id: string) => {
    return doctorAPI.deleteCertification(id)
  },

  // Specializations
  getSpecializations: async () => {
    return doctorAPI.getSpecializations()
  },

  addSpecialization: async (data: any) => {
    return doctorAPI.addSpecialization(data)
  },

  updateSpecialization: async (id: string, data: any) => {
    return doctorAPI.updateSpecialization(id, data)
  },

  deleteSpecialization: async (id: string) => {
    return doctorAPI.deleteSpecialization(id)
  },

  // Custom Specializations
  getCustomSpecializations: async () => {
    return doctorAPI.getCustomSpecializations()
  },

  createCustomSpecialization: async (data: any) => {
    return doctorAPI.createCustomSpecialization(data)
  },

  // Government ID (KYC)
  getGovernmentID: async () => {
    return doctorAPI.getGovernmentID()
  },

  createGovernmentID: async (data: any) => {
    return doctorAPI.createGovernmentID(data)
  },

  updateGovernmentID: async (data: any) => {
    return doctorAPI.updateGovernmentID(data)
  },

  deleteGovernmentID: async () => {
    return doctorAPI.deleteGovernmentID()
  },

  uploadGovernmentIDFiles: async (formData: FormData) => {
    return doctorAPI.uploadGovernmentIDFiles(formData)
  },

  // Registration (Medical Registration)
  getRegistration: async () => {
    return doctorAPI.getRegistration()
  },

  createRegistration: async (data: any) => {
    return doctorAPI.createRegistration(data)
  },

  updateRegistration: async (data: any) => {
    return doctorAPI.updateRegistration(data)
  },

  deleteRegistration: async () => {
    return doctorAPI.deleteRegistration()
  },

  uploadRegistrationCertificate: async (formData: FormData) => {
    return doctorAPI.uploadRegistrationCertificate(formData)
  },

  // KYC Status
  getKYCStatus: async () => {
    return doctorAPI.getKYCStatus()
  },

  uploadDigitalSignature: async (formData: FormData) => {
    return doctorAPI.uploadDigitalSignature(formData)
  },

  // KYC (legacy - kept for backward compatibility)
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