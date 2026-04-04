"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, ArrowLeft, Plus, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConsultationSectionConfig, ConsultationSectionItem } from "@/lib/consultation-types";
import {
  CUSTOM_MEDICINE_QUICK_ADD_DOSE_TYPES,
  CUSTOM_MEDICINE_STRENGTH_UNITS,
  buildMedicinePrescriptionForCustomEntry,
  customMedicineStrengthPlaceholder,
  defaultStrengthUnitForDoseType,
  getCustomMedicineDoseTypeStrengthUnitWarning,
  getCustomMedicineStrengthRangeWarning,
  parseCustomMedicineStrengthValue,
} from "@/lib/medicine-prescription-utils";
import { cn } from "@/lib/utils";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function filterOptions(
  query: string,
  staticOptions: { id: string; label: string }[],
  existing: ConsultationSectionItem[]
): { id: string; label: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return staticOptions.slice(0, 20);
  const combined = [
    ...staticOptions,
    ...existing.filter((i) => i.isCustom).map((i) => ({ id: i.id, label: i.label })),
  ];
  const seen = new Set<string>();
  return combined
    .filter((o) => {
      const key = o.label.toLowerCase();
      if (seen.has(key)) return false;
      if (!o.label.toLowerCase().includes(q)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}

export interface ConsultationSearchAddDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ConsultationSectionConfig;
  existingItems: ConsultationSectionItem[];
  onSelect: (item: ConsultationSectionItem) => void;
  onAddNew: (item: Omit<ConsultationSectionItem, "id">) => ConsultationSectionItem;
  onDuplicate: () => void;
  /** When true, choosing an item that already exists selects it instead of treating as duplicate error. */
  selectExistingOnDuplicate?: boolean;
  /** Called when drawer closes so parent can return focus. */
  onClosed?: () => void;
  /** When set, drawer opens with Add form visible and Name pre-filled (e.g. value not found in search). */
  initialValue?: string;
}

const MEDICINES = "medicines" as const;

export function ConsultationSearchAddDrawer({
  open,
  onOpenChange,
  config,
  existingItems,
  onSelect,
  onAddNew,
  onDuplicate,
  selectExistingOnDuplicate = false,
  onClosed,
  initialValue,
}: ConsultationSearchAddDrawerProps) {
  const isMedicines = config.type === MEDICINES;
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [nameError, setNameError] = useState(false);
  /** Custom medicine quick-add */
  const [medicineDoseType, setMedicineDoseType] = useState<string>("tablet");
  const [medicineStrengthValue, setMedicineStrengthValue] = useState("");
  const [medicineStrengthUnit, setMedicineStrengthUnit] = useState("mg");
  const [medicineNotes, setMedicineNotes] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addNameInputRef = useRef<HTMLInputElement>(null);
  const strengthValueInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const searchPending = open && !showAddForm && search !== debouncedSearch;

  const allFiltered = useMemo(
    () => filterOptions(debouncedSearch, config.staticOptions, existingItems),
    [debouncedSearch, config.staticOptions, existingItems]
  );
  const hasResults = allFiltered.length > 0;
  const canAddNew = debouncedSearch.trim().length > 0;
  const createLabel = debouncedSearch.trim() || addName.trim() || "New";

  useEffect(() => {
    if (!open) return;
    const prefill = (initialValue ?? "").trim();
    const defaultCategory = config.attributeOptions[0] ?? "";
    if (isMedicines) {
      setMedicineDoseType("tablet");
      setMedicineStrengthUnit(defaultStrengthUnitForDoseType("tablet"));
      setMedicineStrengthValue("");
      setMedicineNotes("");
      setNameError(false);
    }
    if (prefill) {
      setSearch(prefill);
      setAddName(prefill);
      setShowAddForm(true);
      setAddCategory(defaultCategory);
      setAddDescription("");
      const id = window.setTimeout(() => addNameInputRef.current?.focus(), 100);
      return () => window.clearTimeout(id);
    }
    setSearch("");
    setShowAddForm(false);
    setAddName("");
    setAddCategory(defaultCategory);
    setAddDescription("");
    setNameError(false);
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, [open, initialValue, isMedicines, config.attributeOptions]);

  useEffect(() => {
    if (!isMedicines || !open) return;
    setMedicineStrengthUnit(defaultStrengthUnitForDoseType(medicineDoseType));
  }, [medicineDoseType, isMedicines, open]);

  const handleClose = (next: boolean) => {
    if (!next) {
      setShowAddForm(false);
      setNameError(false);
      onClosed?.();
    }
    onOpenChange(next);
  };

  const handleSelect = (item: ConsultationSectionItem) => {
    const existing = existingItems.find(
      (i) => i.label.toLowerCase() === item.label.toLowerCase()
    );
    if (existing) {
      if (selectExistingOnDuplicate) {
        onSelect(existing);
        handleClose(false);
      } else {
        onDuplicate();
      }
      return;
    }
    onSelect(item);
    handleClose(false);
  };

  const handleAddNewClick = () => {
    if (!canAddNew && !addName.trim()) return;
    setAddName(debouncedSearch.trim() || addName.trim());
    setShowAddForm(true);
    setNameError(false);
    window.setTimeout(() => addNameInputRef.current?.focus(), 50);
  };

  const strengthParsed = useMemo(
    () => parseCustomMedicineStrengthValue(medicineStrengthValue),
    [medicineStrengthValue]
  );

  const strengthFieldError =
    isMedicines && showAddForm && strengthParsed.kind === "invalid"
      ? strengthParsed.message
      : null;

  const strengthSoftWarnings = useMemo(() => {
    if (!isMedicines || !showAddForm) return [];
    if (strengthParsed.kind !== "ok") return [];
    const w: string[] = [];
    const range = getCustomMedicineStrengthRangeWarning(
      strengthParsed.value,
      medicineStrengthUnit
    );
    if (range) w.push(range);
    const unitHint = getCustomMedicineDoseTypeStrengthUnitWarning(
      medicineDoseType,
      medicineStrengthUnit
    );
    if (unitHint) w.push(unitHint);
    return w;
  }, [
    isMedicines,
    showAddForm,
    strengthParsed,
    medicineStrengthUnit,
    medicineDoseType,
  ]);

  const handleSaveAndUse = () => {
    const name = (addName || debouncedSearch).trim();
    if (!name) {
      setNameError(true);
      addNameInputRef.current?.focus();
      return;
    }
    const exists = existingItems.some((i) => i.label.toLowerCase() === name.toLowerCase());
    if (exists) {
      if (selectExistingOnDuplicate) {
        const existing = existingItems.find(
          (i) => i.label.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          onSelect(existing);
          handleClose(false);
        }
        return;
      }
      onDuplicate();
      return;
    }

    if (isMedicines) {
      const s = parseCustomMedicineStrengthValue(medicineStrengthValue);
      if (s.kind === "invalid") {
        strengthValueInputRef.current?.focus();
        return;
      }
      const tempId = `custom-temp-${Date.now()}`;
      const strengthNum = s.kind === "ok" ? s.value : null;
      const unit = medicineStrengthUnit.trim();
      const medicine = buildMedicinePrescriptionForCustomEntry(tempId, name, {
        doseTypeId: medicineDoseType,
        strengthValue: strengthNum ?? undefined,
        strengthUnit: strengthNum != null && unit ? unit : undefined,
        notes: medicineNotes.trim() || undefined,
      });
      medicine.drug_id = undefined;
      const newItem = onAddNew({
        label: name,
        isCustom: true,
        detail: { medicine },
      });
      onSelect(newItem);
      handleClose(false);
      return;
    }

    const newItem = onAddNew({
      label: name,
      isCustom: true,
      category: addCategory || undefined,
      description: addDescription || undefined,
    });
    onSelect(newItem);
    handleClose(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA") return;
      e.preventDefault();
      if (!showAddForm) {
        if (hasResults && allFiltered.length === 1) {
          const opt = allFiltered[0];
          const item: ConsultationSectionItem =
            existingItems.find((i) => i.id === opt.id || i.label === opt.label) ?? {
              id: opt.id,
              label: opt.label,
            };
          handleSelect(item);
        } else if (canAddNew && !hasResults) {
          handleAddNewClick();
        }
      } else {
        handleSaveAndUse();
      }
    }
  };

  const strengthPlaceholder = customMedicineStrengthPlaceholder(medicineDoseType);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md"
        onPointerDownOutside={() => handleClose(false)}
        onEscapeKeyDown={() => handleClose(false)}
      >
        <SheetHeader>
          {isMedicines && showAddForm ? (
            <div className="space-y-3 pr-8">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 h-8 w-fit gap-1 text-muted-foreground"
                onClick={() => {
                  setShowAddForm(false);
                  setNameError(false);
                  window.setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <SheetTitle>Add Custom Medicine</SheetTitle>
            </div>
          ) : (
            <SheetTitle>{isMedicines ? "Medicines" : `Add ${config.itemLabel}`}</SheetTitle>
          )}
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden py-4">
          {!showAddForm ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="search-drawer" className="sr-only">
                  Search {config.itemLabel}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-drawer"
                    ref={searchInputRef}
                    type="search"
                    placeholder={isMedicines ? "Search medicines…" : `Search ${config.searchPlaceholder}`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="rounded-lg pl-9 border-border/80 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    aria-label={isMedicines ? "Search medicines" : `Search ${config.itemLabel}`}
                  />
                </div>
              </div>
              {searchPending ? (
                <p className="text-sm text-muted-foreground py-2">Searching…</p>
              ) : hasResults ? (
                <ul
                  className="flex flex-col gap-1 overflow-y-auto rounded-md border border-border/80 bg-muted/30 py-1"
                  role="listbox"
                >
                  {allFiltered.map((opt) => {
                    const existingItem = existingItems.find(
                      (i) => i.id === opt.id || i.label === opt.label
                    );
                    const item: ConsultationSectionItem =
                      existingItem ?? { id: opt.id, label: opt.label };
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                          )}
                          onClick={() => handleSelect(item)}
                          role="option"
                        >
                          {opt.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No results found</p>
              )}

              {canAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 rounded-lg border-border/80"
                  onClick={() => handleAddNewClick()}
                >
                  <Plus className="h-4 w-4" />
                  {isMedicines ? `Create "${createLabel}"` : `Add "${createLabel}"`}
                </Button>
              )}
            </>
          ) : isMedicines ? (
            <div
              className="space-y-4 overflow-y-auto pr-1"
              onKeyDown={handleKeyDown}
            >
              <div className="space-y-2">
                <Label htmlFor="add-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-name"
                  ref={addNameInputRef}
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value);
                    if (nameError && e.target.value.trim()) setNameError(false);
                  }}
                  placeholder="Medicine name"
                  className="rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  aria-invalid={nameError}
                  aria-describedby={nameError ? "add-name-error" : undefined}
                />
                {nameError && (
                  <p id="add-name-error" className="text-sm text-destructive">
                    Name is required
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-dose-type">
                  Dose type <span className="text-destructive">*</span>
                </Label>
                <Select value={medicineDoseType} onValueChange={setMedicineDoseType}>
                  <SelectTrigger id="add-dose-type" className="rounded-lg border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_MEDICINE_QUICK_ADD_DOSE_TYPES.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Strength / size (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    ref={strengthValueInputRef}
                    type="text"
                    inputMode="decimal"
                    value={medicineStrengthValue}
                    onChange={(e) => setMedicineStrengthValue(e.target.value)}
                    placeholder={strengthPlaceholder}
                    className={cn(
                      "min-w-0 flex-1 rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-blue-500/30",
                      strengthFieldError && "border-destructive focus-visible:ring-destructive/30"
                    )}
                    aria-label="Strength value"
                    aria-invalid={Boolean(strengthFieldError)}
                    aria-describedby={
                      strengthFieldError
                        ? "add-strength-error"
                        : strengthSoftWarnings.length > 0
                          ? "add-strength-warnings"
                          : undefined
                    }
                  />
                  <Select value={medicineStrengthUnit} onValueChange={setMedicineStrengthUnit}>
                    <SelectTrigger className="w-[100px] shrink-0 rounded-lg border-border/80" aria-label="Strength unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_MEDICINE_STRENGTH_UNITS.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {strengthFieldError && (
                  <p id="add-strength-error" className="text-sm text-destructive">
                    {strengthFieldError}
                  </p>
                )}
                {strengthSoftWarnings.length > 0 && (
                  <div
                    id="add-strength-warnings"
                    className="rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                    role="status"
                  >
                    <ul className="space-y-1.5">
                      {strengthSoftWarnings.map((line) => (
                        <li key={line} className="flex gap-2 leading-snug">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                      Unusual values are allowed — Save &amp; Use will still add this medicine.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-med-notes">Notes (optional)</Label>
                <Textarea
                  id="add-med-notes"
                  value={medicineNotes}
                  onChange={(e) => setMedicineNotes(e.target.value)}
                  placeholder="Special instructions, compound details…"
                  className="min-h-[88px] resize-y rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-border/80 p-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-name"
                  ref={addNameInputRef}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={`${config.itemLabel} name`}
                  className="rounded-lg border-border/80"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-category">Category (optional)</Label>
                <Select value={addCategory || "_"} onValueChange={(v) => setAddCategory(v === "_" ? "" : v)}>
                  <SelectTrigger id="add-category" className="rounded-lg border-border/80">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    {config.attributeOptions.slice(0, 6).map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-desc">Description (optional)</Label>
                <Textarea
                  id="add-desc"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Brief description"
                  className="min-h-[80px] resize-y rounded-lg border-border/80"
                />
              </div>
            </div>
          )}
        </div>
        {showAddForm && (
          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg text-muted-foreground"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
              onClick={handleSaveAndUse}
              disabled={isMedicines ? false : !addName.trim()}
            >
              Save &amp; Use
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
