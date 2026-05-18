import type {
  PackagePricingListItem,
  ServicePricingListItem,
} from "@/lib/labs/api/pricing-services-types";

/** Operational table row — commercial fields excluded from type surface. */
export type ServicePricingTableRow = {
  id: string;
  serviceName: string;
  serviceCode: string;
  categoryName: string;
  priceDisplay: string;
  homeCollectionSupported: boolean;
  tatLabel: string;
  displayStatus: string;
  catalogVisibility: string;
  validityLabel: string;
  isExpired: boolean;
};

/** Drawer-only row — includes commercial display fields from presenter. */
export type ServicePricingDrawerModel = {
  id: string;
  serviceName: string;
  serviceCode: string;
  categoryName: string;
  displayStatus: string;
  catalogVisibility: string;
  isExpired: boolean;
  homeCollectionSupported: boolean;
  tatLabel: string;
  workflowHint: string;
  metadata: Record<string, unknown>;
  lastSyncedAt: string | null;
  isSyncManaged: boolean;
  validFrom: string;
  validTo: string | null;
  currency: string;
  sellingPriceDisplay: string;
  costPriceDisplay: string;
  platformMarginDisplay: string;
};

export type PackagePricingTableRow = {
  id: string;
  packageName: string;
  packageLineageCode: string;
  testsCount: number;
  mrpDisplay: string;
  priceDisplay: string;
  includedTestsPreview: string;
  homeCollectionSupported: boolean;
  fulfillmentLabel: string;
  tatLabel: string;
  displayStatus: string;
  validityLabel: string;
  isExpired: boolean;
};

export type PackagePricingDrawerModel = {
  id: string;
  packageName: string;
  packageLineageCode: string;
  displayStatus: string;
  catalogVisibility: string;
  isExpired: boolean;
  testsCount: number;
  includedTests: { name: string; code: string }[];
  homeCollectionSupported: boolean;
  fulfillmentLabel: string;
  tatLabel: string;
  lastSyncedAt: string | null;
  isSyncManaged: boolean;
  validFrom: string;
  validTo: string | null;
  currency: string;
  mrpDisplay: string;
  sellingPriceDisplay: string;
  costPriceDisplay: string;
  platformMarginDisplay: string;
};

export type ServicePricingCatalogRow = {
  table: ServicePricingTableRow;
  drawer: ServicePricingDrawerModel;
};

export type PackagePricingCatalogRow = {
  table: PackagePricingTableRow;
  drawer: PackagePricingDrawerModel;
};

export function mapServicePricingTableRow(item: ServicePricingListItem): ServicePricingTableRow {
  return {
    id: item.id,
    serviceName: item.service_name,
    serviceCode: item.service_code,
    categoryName: item.category_name,
    priceDisplay: item.price_display,
    homeCollectionSupported: item.home_collection_supported,
    tatLabel: item.tat_label,
    displayStatus: item.display_status,
    catalogVisibility: item.catalog_visibility,
    validityLabel: item.validity_label,
    isExpired: item.is_expired,
  };
}

export function mapServicePricingDrawerModel(item: ServicePricingListItem): ServicePricingDrawerModel {
  return {
    id: item.id,
    serviceName: item.service_name,
    serviceCode: item.service_code,
    categoryName: item.category_name,
    displayStatus: item.display_status,
    catalogVisibility: item.catalog_visibility,
    isExpired: item.is_expired,
    homeCollectionSupported: item.home_collection_supported,
    tatLabel: item.tat_label,
    workflowHint: item.workflow_hint,
    metadata: item.metadata ?? {},
    lastSyncedAt: item.last_synced_at,
    isSyncManaged: item.is_sync_managed,
    validFrom: item.valid_from,
    validTo: item.valid_to,
    currency: item.currency,
    sellingPriceDisplay: item.price_display,
    costPriceDisplay: item.cost_price_display,
    platformMarginDisplay: item.platform_margin_display,
  };
}

export function mapServicePricingCatalogRow(item: ServicePricingListItem): ServicePricingCatalogRow {
  return {
    table: mapServicePricingTableRow(item),
    drawer: mapServicePricingDrawerModel(item),
  };
}

export function mapPackagePricingTableRow(item: PackagePricingListItem): PackagePricingTableRow {
  return {
    id: item.id,
    packageName: item.package_name,
    packageLineageCode: item.package_lineage_code,
    testsCount: item.tests_count,
    mrpDisplay: item.mrp_display,
    priceDisplay: item.price_display,
    includedTestsPreview: item.included_tests_preview,
    homeCollectionSupported: item.home_collection_supported,
    fulfillmentLabel: item.fulfillment_label,
    tatLabel: item.tat_label,
    displayStatus: item.display_status,
    validityLabel: item.validity_label,
    isExpired: item.is_expired,
  };
}

export function mapPackagePricingDrawerModel(item: PackagePricingListItem): PackagePricingDrawerModel {
  return {
    id: item.id,
    packageName: item.package_name,
    packageLineageCode: item.package_lineage_code,
    displayStatus: item.display_status,
    catalogVisibility: item.catalog_visibility,
    isExpired: item.is_expired,
    testsCount: item.tests_count,
    includedTests: item.included_tests ?? [],
    homeCollectionSupported: item.home_collection_supported,
    fulfillmentLabel: item.fulfillment_label,
    tatLabel: item.tat_label,
    lastSyncedAt: item.last_synced_at,
    isSyncManaged: item.is_sync_managed,
    validFrom: item.valid_from,
    validTo: item.valid_to,
    currency: item.currency,
    mrpDisplay: item.mrp_display,
    sellingPriceDisplay: item.price_display,
    costPriceDisplay: item.cost_price_display,
    platformMarginDisplay: item.platform_margin_display,
  };
}

export function mapPackagePricingCatalogRow(item: PackagePricingListItem): PackagePricingCatalogRow {
  return {
    table: mapPackagePricingTableRow(item),
    drawer: mapPackagePricingDrawerModel(item),
  };
}

function formatValidityDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatPricingValidFrom(iso: string): string {
  return formatValidityDate(iso);
}

export function formatPricingValidTo(iso: string | null): string {
  return formatValidityDate(iso);
}
