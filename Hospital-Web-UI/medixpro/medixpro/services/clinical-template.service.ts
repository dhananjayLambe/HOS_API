import { backendAxiosClient } from "@/lib/axiosClient";

export interface CreateClinicalTemplateBody {
  name: string;
  consultation_type: string;
  template_data: unknown;
}

/** Row returned by GET /consultations/clinical-templates/ */
export interface ClinicalTemplateListItem {
  id: string;
  name: string;
  consultation_type: string;
  template_data: ClinicalTemplateDataField;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Shape stored in template_data (matches clean-template-payload output). */
export interface ClinicalTemplateDataField {
  diagnosis?: unknown[];
  medicines?: unknown[];
  investigations?: Record<string, unknown>[];
  advice?: string;
  follow_up?: string;
}

export interface GetClinicalTemplatesParams {
  type: string;
  search?: string;
}

export async function createClinicalTemplate(data: CreateClinicalTemplateBody) {
  return backendAxiosClient.post("consultations/clinical-templates/", data);
}

export async function getClinicalTemplates(params: GetClinicalTemplatesParams) {
  return backendAxiosClient.get<ClinicalTemplateListItem[]>("consultations/clinical-templates/", {
    params: {
      type: params.type,
      ...(params.search != null && params.search !== "" ? { search: params.search } : {}),
    },
  });
}
