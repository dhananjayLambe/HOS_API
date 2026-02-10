"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus } from "lucide-react";
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
  /** Called when drawer closes so parent can return focus. */
  onClosed?: () => void;
  /** When set, drawer opens with Add form visible and Name pre-filled (e.g. value not found in search). */
  initialValue?: string;
}

export function ConsultationSearchAddDrawer({
  open,
  onOpenChange,
  config,
  existingItems,
  onSelect,
  onAddNew,
  onDuplicate,
  onClosed,
  initialValue,
}: ConsultationSearchAddDrawerProps) {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addNameInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const allFiltered = useMemo(
    () => filterOptions(debouncedSearch, config.staticOptions, existingItems),
    [debouncedSearch, config.staticOptions, existingItems]
  );
  const hasResults = allFiltered.length > 0;
  const canAddNew = debouncedSearch.trim().length > 0;
  const addLabel = debouncedSearch.trim() || addName.trim() || "New";

  useEffect(() => {
    if (open) {
      const prefill = (initialValue ?? "").trim();
      if (prefill) {
        setSearch(prefill);
        setAddName(prefill);
        setShowAddForm(true);
        setAddCategory("");
        setAddDescription("");
        setTimeout(() => addNameInputRef.current?.focus(), 100);
      } else {
        setSearch("");
        setShowAddForm(false);
        setAddName("");
        setAddCategory("");
        setAddDescription("");
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    }
  }, [open, initialValue]);

  const handleClose = (open: boolean) => {
    if (!open) {
      setShowAddForm(false);
      onClosed?.();
    }
    onOpenChange(open);
  };

  const handleSelect = (item: ConsultationSectionItem) => {
    const existing = existingItems.find(
      (i) => i.label.toLowerCase() === item.label.toLowerCase()
    );
    if (existing) {
      onDuplicate();
      return;
    }
    onSelect(item);
    handleClose(false);
  };

  const handleAddNewClick = () => {
    if (!canAddNew && !addName.trim()) return;
    setAddName(debouncedSearch.trim() || addName.trim());
    setShowAddForm(true);
  };

  const handleSaveAndUse = () => {
    const name = (addName || debouncedSearch).trim();
    if (!name) return;
    const exists = existingItems.some(
      (i) => i.label.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      onDuplicate();
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
    if (e.key === "Enter" && !showAddForm) {
      if (hasResults && allFiltered.length === 1) {
        const opt = allFiltered[0];
        const item: ConsultationSectionItem = existingItems.find(
          (i) => i.id === opt.id || i.label === opt.label
        ) ?? { id: opt.id, label: opt.label };
        handleSelect(item);
      } else if (canAddNew && !hasResults) {
        handleAddNewClick();
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md"
        onPointerDownOutside={() => handleClose(false)}
        onEscapeKeyDown={() => handleClose(false)}
      >
        <SheetHeader>
          <SheetTitle>Add {config.itemLabel}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden py-4">
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
                placeholder={`Search ${config.searchPlaceholder}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                aria-label={`Search ${config.itemLabel}`}
              />
            </div>
          </div>

          {!showAddForm ? (
            <>
              {hasResults ? (
                <ul
                  className="flex flex-col gap-1 overflow-y-auto rounded-md border bg-muted/30 py-1"
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
                            "w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <p className="text-sm text-muted-foreground py-2">
                  No results found.
                </p>
              )}

              {canAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleAddNewClick}
                >
                  <Plus className="h-4 w-4" />
                  Add &quot;{addLabel}&quot;
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-4 rounded-lg border p-4">
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
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-category">Category (optional)</Label>
                <Select value={addCategory || "_"} onValueChange={(v) => setAddCategory(v === "_" ? "" : v)}>
                  <SelectTrigger id="add-category">
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
                  className="min-h-[80px] resize-y"
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
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndUse}
              disabled={!addName.trim()}
            >
              Save &amp; Use
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
