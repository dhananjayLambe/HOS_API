"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { backendAxiosClient } from "@/lib/axiosClient";

export interface FieldConfig {
  key: string;
  type: "number" | "text" | "single_select" | "multi_select" | "calculated";
  label: string;
  unit?: string;
  supported_units?: string[];
  canonical_unit?: string;
  formula?: string;
  range?: [number, number];
  step?: number; // For number fields - increment step (e.g., 1 for temperature)
  min?: number; // Minimum value
  max?: number; // Maximum value
  required?: boolean; // Field is required
  minLength?: number; // Minimum text length
  maxLength?: number; // Maximum text length
  tab_order?: number; // Tab order for keyboard navigation
  pair_with?: string; // Field key to pair with in same row
  validation?: {
    pattern?: string; // Regex pattern
    message?: string; // Custom error message
    custom?: string; // Custom validation rule name
  };
  options?: Array<{ value: string; label: string }>;
  multiline?: boolean;
  placeholder?: string;
  dependencies?: string[];
  ui_config?: Record<string, any>;
  ui_group?: string; // Group fields together (e.g., "body", "bp", "basic")
}

export interface SectionItem {
  code: string;
  label: string;
  fields: FieldConfig[];
}

export interface Section {
  section: string;
  items: SectionItem[];
}

export interface SpecialtySectionConfig {
  required?: string[];
  optional?: string[];
  default_required?: string[];
  default_optional?: string[];
  notes?: string;
}

export interface SpecialtyConfig {
  sections: string[];
  [section: string]:
    | string[]
    | SpecialtySectionConfig;
}

export interface PreConsultationTemplate {
  specialty: string;
  metadata_version: string;
  template: {
    sections: Section[];
  };
  specialty_config: SpecialtyConfig;
  specialty_ranges?: Record<string, {
    min?: number;
    max?: number;
    canonical_unit?: string;
    notes?: string;
  }>; // Specialty-specific validation ranges
}

interface TemplateStore {
  template: PreConsultationTemplate | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedVersion: string | null;
  fetchTemplate: (forceRefresh?: boolean) => Promise<void>;
  clearTemplate: () => void;
  refreshTemplate: () => Promise<void>;
  getSectionConfig: (sectionCode: string) => SpecialtySectionConfig | null;
  isSectionEnabled: (sectionCode: string) => boolean;
  getDefaultRequiredFields: (sectionCode: string) => string[];
  getDefaultOptionalFields: (sectionCode: string) => string[];
}

const STORAGE_KEY = "pre-consultation-template";
const VERSION_KEY = "pre-consultation-template-version";

export const usePreConsultationTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      template: null,
      isLoading: false,
      error: null,
      lastFetchedVersion: null,

      fetchTemplate: async (forceRefresh: boolean = false) => {
        const state = get();
        
        // Check if we have a cached version (skip if force refresh)
        if (!forceRefresh && typeof window !== "undefined") {
          const cachedVersion = localStorage.getItem(VERSION_KEY);
          const cachedTemplate = localStorage.getItem(STORAGE_KEY);
          
          if (cachedTemplate && cachedVersion) {
            try {
              const parsed = JSON.parse(cachedTemplate);
              set({ 
                template: parsed,
                lastFetchedVersion: cachedVersion 
              });
              
              // Always fetch to ensure we have latest template (cache is just for initial render)
              // The version check happens after fetch
            } catch (e) {
              // Invalid cache, continue to fetch
            }
          }
        }

        set({ isLoading: true, error: null });

        try {
          // Add timestamp query param to bypass browser cache in development
          const isDevelopment = process.env.NODE_ENV === 'development';
          const cacheBuster = isDevelopment ? `?t=${Date.now()}` : '';
          
          // Use backendAxiosClient for direct Django backend calls
          const response = await backendAxiosClient.get(`/consultations/pre-consult/template/${cacheBuster}`);

          const templateData: PreConsultationTemplate = response.data;

          // Check if version changed - only update cache if version is different
          const currentVersion = get().lastFetchedVersion;
          const newVersion = templateData.metadata_version;
          
          // Always update state with new template (even if version same - for development)
          set({
            template: templateData,
            lastFetchedVersion: newVersion,
            isLoading: false,
            error: null,
          });

          // In development, always update cache to reflect latest changes
          // In production, only update if version changed
          if (typeof window !== "undefined") {
            const shouldUpdateCache = isDevelopment || currentVersion !== newVersion || !localStorage.getItem(STORAGE_KEY);
            if (shouldUpdateCache) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(templateData));
              localStorage.setItem(VERSION_KEY, newVersion);
            }
          }
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.error ||
            error?.message ||
            "Failed to fetch template";

          // If fetch fails, clear in-memory and localStorage cache
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(VERSION_KEY);
            } catch {
              // ignore storage errors
            }
          }

          set({
            template: null,
            lastFetchedVersion: null,
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      clearTemplate: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(VERSION_KEY);
        }
        set({
          template: null,
          lastFetchedVersion: null,
          error: null,
        });
      },

      // Helper to force refresh template (clears cache and fetches fresh)
      refreshTemplate: async () => {
        get().clearTemplate();
        await get().fetchTemplate(true);
      },

      getSectionConfig: (sectionCode: string) => {
        const { template } = get();
        if (!template?.specialty_config) return null;
        
        const config = template.specialty_config[sectionCode];
        if (Array.isArray(config)) return null; // sections array
        return (config as SpecialtySectionConfig) || null;
      },

      isSectionEnabled: (sectionCode: string) => {
        const { template } = get();
        if (!template?.specialty_config?.sections) return false;
        return template.specialty_config.sections.includes(sectionCode);
      },

      getDefaultRequiredFields: (sectionCode: string) => {
        const config = get().getSectionConfig(sectionCode);
        if (!config) return [];
        return config.default_required || [];
      },

      getDefaultOptionalFields: (sectionCode: string) => {
        const config = get().getSectionConfig(sectionCode);
        if (!config) return [];
        return config.default_optional || [];
      },
    }),
    {
      name: "pre-consultation-template-store",
      partialize: (state) => ({
        template: state.template,
        lastFetchedVersion: state.lastFetchedVersion,
      }),
    }
  )
);
