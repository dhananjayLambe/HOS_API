/** Aligns with DiagnosticOrder.sample_collection_mode (labs operational flow). */
export const COLLECTION_TYPES = ["HOME", "VISIT"] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number];

export const COLLECTION_TYPE_LABELS: Record<CollectionType, string> = {
  HOME: "Home",
  VISIT: "Visit",
};
