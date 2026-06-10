"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileStack, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatTemplateDateShort,
  formatTemplateDateTooltip,
} from "@/lib/format-template-date";
import {
  getTemplateCategoryBadgeClass,
  getTemplateCategoryLabel,
  type TemplateCategory,
} from "@/lib/template-category";
import { cn } from "@/lib/utils";
import type { TemplateListItem } from "@/services/template-management.service";

interface TemplateManagementListProps {
  items: TemplateListItem[];
  onDelete: (item: TemplateListItem) => void;
  deletingId?: string | null;
}

function UsageBadge({ count }: { count: number }) {
  const label = count === 1 ? "1 Use" : `${count.toLocaleString("en-IN")} Uses`;
  const isPopular = count >= 50;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium tabular-nums",
        isPopular && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      )}
    >
      {label}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: TemplateCategory }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", getTemplateCategoryBadgeClass(category))}
    >
      {getTemplateCategoryLabel(category)}
    </Badge>
  );
}

interface TemplateRowProps {
  item: TemplateListItem;
  onDelete: (item: TemplateListItem) => void;
  deletingId?: string | null;
}

function TemplateRow({ item, onDelete, deletingId }: TemplateRowProps) {
  const router = useRouter();

  const openView = () => router.push(`/doctor/templates/${item.id}`);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openView();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={`View ${item.name}`}
      onClick={openView}
      onKeyDown={handleKeyDown}
      className={cn(
        "group grid cursor-pointer grid-cols-12 items-center gap-3 border-b border-border/60 px-4 py-3.5 text-sm transition-colors duration-150 last:border-b-0",
        "hover:bg-primary/5 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)_/_0.35)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="col-span-12 flex min-w-0 items-center gap-3 sm:col-span-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <FileStack className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground sm:hidden">
            {getTemplateCategoryLabel(item.category)}
          </p>
        </div>
      </div>

      <div className="hidden sm:col-span-3 sm:block">
        <CategoryBadge category={item.category} />
      </div>

      <div className="col-span-4 sm:col-span-2">
        <UsageBadge count={item.usage_count ?? 0} />
      </div>

      <div className="col-span-5 sm:col-span-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm font-medium text-muted-foreground underline decoration-dotted underline-offset-4">
              {formatTemplateDateShort(item.updated_at)}
            </span>
          </TooltipTrigger>
          <TooltipContent>{formatTemplateDateTooltip(item.updated_at)}</TooltipContent>
        </Tooltip>
      </div>

      <div
        className="col-span-3 flex items-center justify-end gap-1 sm:col-span-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link href={`/doctor/templates/${item.id}`} aria-label={`View ${item.name}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>View template</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deletingId === item.id}
              onClick={() => onDelete(item)}
              aria-label={`Delete ${item.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete template</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function TemplateManagementList({
  items,
  onDelete,
  deletingId,
}: TemplateManagementListProps) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-12 sm:gap-3">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-2">Used</div>
          <div className="col-span-2">Updated</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div>
          {items.map((item) => (
            <TemplateRow
              key={item.id}
              item={item}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
