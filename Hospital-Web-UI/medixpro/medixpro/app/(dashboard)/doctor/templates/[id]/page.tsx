"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateView } from "@/components/templates/template-view";
import { getTemplate, type TemplateDetail } from "@/services/template-management.service";

interface ViewTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default function ViewTemplatePage({ params }: ViewTemplatePageProps) {
  const { id } = use(params);
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getTemplate(id);
        if (!cancelled) setTemplate(res.data);
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as {
          response?: { data?: { detail?: string; message?: string } };
          message?: string;
        };
        setError(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Unable to load template."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/doctor/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load template</AlertTitle>
          <AlertDescription>{error ?? "Template not found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 p-4 md:p-6 lg:p-8">
      <TemplateView template={template} />
    </div>
  );
}
