import { cn } from "@/lib/utils";
import { typeSectionTitle } from "@/lib/design-system/clinical";

type ClinicalSectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
};

export function ClinicalSectionHeader({
  title,
  description,
  className,
  actions,
}: ClinicalSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-2",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className={typeSectionTitle}>{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-[hsl(var(--clinical-text-secondary))]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
