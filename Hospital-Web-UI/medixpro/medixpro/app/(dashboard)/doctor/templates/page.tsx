"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, FileStack, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog";
import { TemplateManagementEmptyState } from "@/components/templates/template-management-empty-state";
import { TemplateManagementFilters } from "@/components/templates/template-management-filters";
import { TemplateManagementList } from "@/components/templates/template-management-list";
import { TemplateManagementPagination } from "@/components/templates/template-management-pagination";
import {
  TemplateManagementFiltersSkeleton,
  TemplateManagementListSkeleton,
} from "@/components/templates/template-management-skeletons";
import { useTemplateList } from "@/hooks/use-template-list";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { deleteTemplate, type TemplateListItem } from "@/services/template-management.service";

export default function TemplateManagementPage() {
  const toast = useToastNotification();
  const {
    filters,
    setFilters,
    page,
    setPage,
    data,
    loading,
    loadError,
    refetch,
    handleResetFilters,
    pageSize,
    showInitialSkeleton,
  } = useTemplateList();

  const [pendingDelete, setPendingDelete] = useState<TemplateListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteRequest = useCallback((item: TemplateListItem) => {
    setPendingDelete(item);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeletingId(pendingDelete.id);
    try {
      await deleteTemplate(pendingDelete.id);
      toast.success(`Template "${pendingDelete.name}" deleted`);
      setPendingDelete(null);
      refetch();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string; message?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to delete template."
      );
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }, [pendingDelete, refetch, toast]);

  const total = data?.count ?? 0;
  const results = data?.results ?? [];
  const hasActiveFilters =
    filters.category !== "all" || filters.search.trim().length > 0;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Template Management</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Browse, search, and manage reusable consultation templates saved from your
            consultations.
          </p>
        </div>
        {!showInitialSkeleton && !loadError ? (
          <Badge
            variant="secondary"
            className="w-fit gap-1.5 px-3 py-1.5 text-sm font-medium tabular-nums"
          >
            <FileStack className="h-4 w-4" />
            {total.toLocaleString("en-IN")} {total === 1 ? "Template" : "Templates"}
          </Badge>
        ) : null}
      </div>

      {showInitialSkeleton ? (
        <TemplateManagementFiltersSkeleton />
      ) : (
        <TemplateManagementFilters filters={filters} onChange={setFilters} />
      )}

      {loadError ? (
        <Alert className="border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load templates</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {showInitialSkeleton ? (
        <TemplateManagementListSkeleton />
      ) : loading ? (
        <TemplateManagementListSkeleton rows={3} />
      ) : !loadError && results.length === 0 ? (
        <div className="space-y-4">
          <TemplateManagementEmptyState />
          {hasActiveFilters ? (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : !loadError ? (
        <div className="space-y-4">
          <TemplateManagementList
            items={results}
            onDelete={handleDeleteRequest}
            deletingId={deletingId}
          />
          <div className="rounded-xl border bg-card px-4 shadow-sm">
            <TemplateManagementPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}

      <DeleteTemplateDialog
        template={pendingDelete}
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
