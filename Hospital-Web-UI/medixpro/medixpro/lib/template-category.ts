export type TemplateCategory =
  | "full_consultation"
  | "quick_prescription"
  | "test_only";

export type TemplateCategoryFilter = "all" | TemplateCategory;

export type TemplateSortOption = "updated" | "most_used" | "name_asc";

export interface TemplateListFilters {
  category: TemplateCategoryFilter;
  search: string;
  sort: TemplateSortOption;
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  full_consultation: "Full Consultation",
  quick_prescription: "Quick Prescription",
  test_only: "Test Only Visit",
};

export const TEMPLATE_CATEGORY_FILTER_OPTIONS: {
  value: TemplateCategoryFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "full_consultation", label: TEMPLATE_CATEGORY_LABELS.full_consultation },
  { value: "quick_prescription", label: TEMPLATE_CATEGORY_LABELS.quick_prescription },
  { value: "test_only", label: TEMPLATE_CATEGORY_LABELS.test_only },
];

export const TEMPLATE_SORT_OPTIONS: { value: TemplateSortOption; label: string }[] = [
  { value: "updated", label: "Updated" },
  { value: "most_used", label: "Most Used" },
  { value: "name_asc", label: "Name A–Z" },
];

export function getTemplateCategoryLabel(category: TemplateCategory): string {
  return TEMPLATE_CATEGORY_LABELS[category] ?? category;
}

const TEMPLATE_CATEGORY_BADGE_CLASS: Record<TemplateCategory, string> = {
  full_consultation: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
  quick_prescription:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  test_only:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
};

export function getTemplateCategoryBadgeClass(category: TemplateCategory): string {
  return TEMPLATE_CATEGORY_BADGE_CLASS[category] ?? TEMPLATE_CATEGORY_BADGE_CLASS.full_consultation;
}

export function sortOptionToOrdering(sort: TemplateSortOption): string {
  switch (sort) {
    case "most_used":
      return "-usage_count";
    case "name_asc":
      return "name";
    case "updated":
    default:
      return "-updated_at";
  }
}

export function orderingToSortOption(ordering: string | null): TemplateSortOption {
  if (ordering === "-usage_count") return "most_used";
  if (ordering === "name") return "name_asc";
  return "updated";
}

export type TemplateEditorSection =
  | "diagnosis"
  | "medicines"
  | "investigations"
  | "advice"
  | "follow_up";

export function getEditorSectionsForCategory(
  category: TemplateCategory
): TemplateEditorSection[] {
  switch (category) {
    case "quick_prescription":
      return ["medicines", "advice"];
    case "test_only":
      return ["investigations"];
    case "full_consultation":
    default:
      return ["diagnosis", "medicines", "investigations", "advice", "follow_up"];
  }
}

export function isTemplateCategory(value: string | null): value is TemplateCategory {
  return (
    value === "full_consultation" ||
    value === "quick_prescription" ||
    value === "test_only"
  );
}

export function isTemplateCategoryFilter(
  value: string | null
): value is TemplateCategoryFilter {
  return value === "all" || isTemplateCategory(value);
}

export function isTemplateSortOption(value: string | null): value is TemplateSortOption {
  return value === "updated" || value === "most_used" || value === "name_asc";
}
