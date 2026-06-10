import type { ClinicalTemplateData } from "@/lib/clean-template-payload";
import type { TemplateCategory } from "@/lib/template-category";
import { backendAxiosClient } from "@/lib/axiosClient";

export interface TemplateListItem {
  id: string;
  name: string;
  category: TemplateCategory;
  usage_count: number;
  updated_at: string;
}

export interface TemplateDetail extends TemplateListItem {
  template_data: ClinicalTemplateData;
}

export interface TemplateListResponse {
  count: number;
  results: TemplateListItem[];
}

export interface ListTemplatesParams {
  category?: TemplateCategory;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

/** PATCH body — only name and template_data are writable. */
export interface UpdateTemplateBody {
  name?: string;
  template_data?: ClinicalTemplateData;
}

export async function listTemplates(params: ListTemplatesParams = {}) {
  return backendAxiosClient.get<TemplateListResponse>("v1/templates/", {
    params: {
      ...(params.category ? { category: params.category } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.page != null ? { page: params.page } : {}),
      ...(params.page_size != null ? { page_size: params.page_size } : {}),
      ...(params.ordering ? { ordering: params.ordering } : {}),
    },
  });
}

export async function getTemplate(id: string) {
  return backendAxiosClient.get<TemplateDetail>(`v1/templates/${id}/`);
}

export async function updateTemplate(id: string, body: UpdateTemplateBody) {
  const payload: UpdateTemplateBody = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.template_data !== undefined) payload.template_data = body.template_data;
  return backendAxiosClient.patch<TemplateDetail>(`v1/templates/${id}/`, payload);
}

export async function deleteTemplate(id: string) {
  return backendAxiosClient.delete(`v1/templates/${id}/`);
}

/** Server-side usage increment when a template is applied during consultation. */
export async function recordTemplateUse(id: string) {
  return backendAxiosClient.post<{ usage_count: number }>(`v1/templates/${id}/record-use/`);
}
