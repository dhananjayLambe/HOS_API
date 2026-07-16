import type { LucideIcon } from "lucide-react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClinicalEmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ClinicalEmptyState({
  title,
  description,
  icon: Icon = FlaskConical,
  actionLabel,
  onAction,
  className,
}: ClinicalEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-accent-archived-soft))] px-6 py-12 text-center",
        className
      )}
    >
      <Icon className="mx-auto mb-3 h-8 w-8 text-[hsl(var(--clinical-text-meta))]" />
      <p className="text-base font-semibold text-[hsl(var(--clinical-text-primary))]">
        {title}
      </p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[hsl(var(--clinical-text-secondary))]">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          className="mt-4"
          variant="outline"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
