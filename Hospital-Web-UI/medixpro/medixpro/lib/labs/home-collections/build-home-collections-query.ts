export type HomeCollectionsStatusTab = "pending" | "assigned" | "active" | "collected" | "failed" | "";

export type HomeCollectionsDatePreset = "today" | "tomorrow" | "week" | "";

export type HomeCollectionsFilterState = {
  statusTab: HomeCollectionsStatusTab;
  datePreset: HomeCollectionsDatePreset;
  search: string;
};

export const DEFAULT_HOME_COLLECTIONS_FILTERS: HomeCollectionsFilterState = {
  statusTab: "pending",
  datePreset: "today",
  search: "",
};

export const HOME_COLLECTIONS_TAB_OPTIONS: { id: HomeCollectionsStatusTab; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "assigned", label: "Assigned" },
  { id: "active", label: "In Progress" },
  { id: "collected", label: "Collected" },
  { id: "failed", label: "Failed" },
];

export const HOME_COLLECTIONS_DATE_OPTIONS: { id: HomeCollectionsDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This week" },
];
