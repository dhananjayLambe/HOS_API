"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  MessageSquareText,
  Pill,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClinicalTemplateData } from "@/lib/clean-template-payload";
import {
  formatTemplateDateShort,
  formatTemplateDateTooltip,
} from "@/lib/format-template-date";
import {
  formatAdviceDisplay,
  formatDiagnosisRow,
  formatFollowUpForDisplay,
  formatInvestigationRow,
  formatMedicineRow,
  hasFollowUpDisplayContent,
} from "@/lib/template-display-formatters";
import {
  getEditorSectionsForCategory,
  getTemplateCategoryBadgeClass,
  getTemplateCategoryLabel,
  type TemplateCategory,
  type TemplateEditorSection,
} from "@/lib/template-category";
import { cn } from "@/lib/utils";
import type { TemplateDetail } from "@/services/template-management.service";

const SECTION_CONFIG: Record<
  TemplateEditorSection,
  { title: string; icon: typeof Stethoscope; accent: string }
> = {
  diagnosis: {
    title: "Diagnosis",
    icon: Stethoscope,
    accent: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  },
  medicines: {
    title: "Medicines",
    icon: Pill,
    accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  investigations: {
    title: "Investigations",
    icon: FlaskConical,
    accent: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
  },
  advice: {
    title: "Instructions",
    icon: MessageSquareText,
    accent: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  },
  follow_up: {
    title: "Follow-up",
    icon: CalendarClock,
    accent: "text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300",
  },
};

function normalizeTemplateData(data: ClinicalTemplateData | undefined) {
  const raw = data ?? ({} as ClinicalTemplateData);
  return {
    diagnosis: Array.isArray(raw.diagnosis) ? raw.diagnosis : [],
    medicines: Array.isArray(raw.medicines) ? raw.medicines : [],
    investigations: Array.isArray(raw.investigations) ? raw.investigations : [],
    advice: raw.advice,
    follow_up: raw.follow_up,
  };
}

function SectionShell({
  section,
  count,
  children,
}: {
  section: TemplateEditorSection;
  count?: number;
  children: ReactNode;
}) {
  const config = SECTION_CONFIG[section];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b bg-muted/20 px-5 py-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
          {count != null ? (
            <p className="text-xs text-muted-foreground">
              {count} {count === 1 ? "item" : "items"}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function ListItem({
  title,
  subtitle,
  tags,
}: {
  title: string;
  subtitle?: string;
  tags?: string[];
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3.5 py-3 text-sm">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
        {tags && tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FollowUpContent({ raw }: { raw: unknown }) {
  const display = formatFollowUpForDisplay(raw);
  if (!display) return null;

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{display.primary}</p>
      {display.details.length > 0 ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {display.details.map((item) => (
            <div key={item.label} className="rounded-lg border bg-background px-3 py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

interface TemplateViewProps {
  template: TemplateDetail;
}

export function TemplateView({ template }: TemplateViewProps) {
  const templateData = normalizeTemplateData(template.template_data);
  const sections = getEditorSectionsForCategory(template.category);
  const usageLabel =
    template.usage_count === 1
      ? "1 Use"
      : `${(template.usage_count ?? 0).toLocaleString("en-IN")} Uses`;

  const adviceText = formatAdviceDisplay(templateData.advice);

  const renderSection = (section: TemplateEditorSection) => {
    if (section === "advice") {
      if (!adviceText) return null;
      return (
        <SectionShell key={section} section={section}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {adviceText}
          </p>
        </SectionShell>
      );
    }

    if (section === "follow_up") {
      if (!hasFollowUpDisplayContent(templateData.follow_up)) return null;
      return (
        <SectionShell key={section} section={section}>
          <FollowUpContent raw={templateData.follow_up} />
        </SectionShell>
      );
    }

    if (section === "diagnosis") {
      if (templateData.diagnosis.length === 0) return null;
      return (
        <SectionShell key={section} section={section} count={templateData.diagnosis.length}>
          <div className="space-y-2.5">
            {templateData.diagnosis.map((row, index) => {
              const display = formatDiagnosisRow(row, `Diagnosis ${index + 1}`);
              return (
                <ListItem
                  key={index}
                  title={display.title}
                  subtitle={display.subtitle}
                  tags={display.tags}
                />
              );
            })}
          </div>
        </SectionShell>
      );
    }

    if (section === "medicines") {
      if (templateData.medicines.length === 0) return null;
      return (
        <SectionShell key={section} section={section} count={templateData.medicines.length}>
          <div className="space-y-2.5">
            {templateData.medicines.map((row, index) => {
              const display = formatMedicineRow(row, `Medicine ${index + 1}`);
              return (
                <ListItem
                  key={index}
                  title={display.title}
                  subtitle={display.subtitle}
                  tags={display.tags}
                />
              );
            })}
          </div>
        </SectionShell>
      );
    }

    if (section === "investigations") {
      if (templateData.investigations.length === 0) return null;
      return (
        <SectionShell key={section} section={section} count={templateData.investigations.length}>
          <div className="space-y-2.5">
            {templateData.investigations.map((row, index) => {
              const display = formatInvestigationRow(row, `Investigation ${index + 1}`);
              return (
                <ListItem
                  key={index}
                  title={display.title}
                  subtitle={display.subtitle}
                  tags={display.tags}
                />
              );
            })}
          </div>
        </SectionShell>
      );
    }

    return null;
  };

  const visibleSections = sections
    .map((section) => {
      const content = renderSection(section);
      if (!content) return null;
      return {
        section,
        content,
        fullWidth: section === "advice" || section === "follow_up",
      };
    })
    .filter((block): block is NonNullable<typeof block> => block != null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" className="shrink-0 rounded-xl" asChild>
              <Link href="/doctor/templates" aria-label="Back to templates">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Consultation Template
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {template.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    getTemplateCategoryBadgeClass(template.category as TemplateCategory)
                  )}
                >
                  {getTemplateCategoryLabel(template.category as TemplateCategory)}
                </Badge>
                <Badge variant="secondary" className="gap-1 font-medium tabular-nums">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {usageLabel}
                </Badge>
                <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span title={formatTemplateDateTooltip(template.updated_at)}>
                    Updated {formatTemplateDateShort(template.updated_at)}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {visibleSections.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleSections.map((block) => (
            <div key={block.section} className={cn(block.fullWidth && "lg:col-span-2")}>
              {block.content}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold">No clinical content</p>
            <p className="max-w-md text-sm text-muted-foreground">
              This template does not contain any diagnosis, medicines, investigations, or
              instructions to display.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
