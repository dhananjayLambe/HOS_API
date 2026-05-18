export const PRICING_CATALOG_API_VERSION = "v1" as const;

export type PricingCatalogTab = "services" | "packages";

export type PricingCatalogVisibility = "visible" | "hidden" | "retired";

export type IncludedTestItem = {
  name: string;
  code: string;
};

export type ServicePricingListItem = {
  id: string;
  service_name: string;
  service_code: string;
  category_name: string;
  selling_price: string;
  cost_price: string | null;
  platform_margin: string | null;
  currency: string;
  home_collection_supported: boolean;
  report_delivery_hours: number;
  is_active: boolean;
  is_available: boolean;
  valid_from: string;
  valid_to: string | null;
  metadata: Record<string, unknown>;
  updated_at: string | null;
  workflow_hint: string;
  display_status: string;
  catalog_visibility: PricingCatalogVisibility | string;
  last_synced_at: string | null;
  is_sync_managed: boolean;
  is_expired: boolean;
  validity_label: string;
  tat_label: string;
  price_display: string;
  cost_price_display: string;
  platform_margin_display: string;
};

export type PackagePricingListItem = {
  id: string;
  package_name: string;
  package_lineage_code: string;
  category_name: string;
  tests_count: number;
  mrp: string;
  selling_price: string;
  cost_price: string | null;
  platform_margin: string | null;
  currency: string;
  fulfillment_mode: string;
  home_collection_supported: boolean;
  report_delivery_hours: number;
  is_active: boolean;
  is_available: boolean;
  valid_from: string;
  valid_to: string | null;
  included_tests: IncludedTestItem[];
  metadata: Record<string, unknown>;
  updated_at: string | null;
  display_status: string;
  catalog_visibility: PricingCatalogVisibility | string;
  last_synced_at: string | null;
  is_sync_managed: boolean;
  is_expired: boolean;
  validity_label: string;
  tat_label: string;
  price_display: string;
  mrp_display: string;
  cost_price_display: string;
  platform_margin_display: string;
  fulfillment_label: string;
  included_tests_preview: string;
};

export type PricingCatalogListResponse<T> = {
  version: typeof PRICING_CATALOG_API_VERSION;
  results: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PricingCatalogSummary = {
  version: typeof PRICING_CATALOG_API_VERSION;
  active_services: number;
  active_packages: number;
  home_collection_enabled: number;
  avg_tat_hours: number | null;
  unavailable_tests: number;
};
