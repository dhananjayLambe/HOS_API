"use client";

import type { UploadFileItem as BaseUploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import type { ReportArtifactType } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { inferArtifactType } from "@/lib/labs/reports/completion/operational-contract";
import {
  validateIncomingFiles,
  type UploadFileRejection,
} from "@/lib/labs/reports/upload/upload-file-validation";
import { useCallback, useEffect, useRef, useState } from "react";

export type UploadFileItem = BaseUploadFileItem & {
  artifactType: ReportArtifactType;
  isPrimary: boolean;
};

function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".zip")) return "application/zip";
  if (/\.(jpe?g)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".txt")) return "text/plain";
  return file.type;
}

function shouldAutoPrimary(files: UploadFileItem[], artifactType: ReportArtifactType): boolean {
  if (files.some((file) => file.isPrimary)) return false;
  if (artifactType === "PRIMARY_REPORT") return true;
  return files.length === 0;
}

function fileMeta(file: File, options: { isPrimary?: boolean; existingFiles?: UploadFileItem[] } = {}): UploadFileItem {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const type = inferMimeType(file);
  const artifactType = inferArtifactType(file.name, type);
  const objectUrl = URL.createObjectURL(file);
  return {
    id,
    name: file.name,
    type,
    size: file.size,
    file,
    objectUrl,
    artifactType,
    isPrimary: options.isPrimary ?? shouldAutoPrimary(options.existingFiles ?? [], artifactType),
  };
}

function ensurePrimary(files: UploadFileItem[]): UploadFileItem[] {
  if (files.length === 0) return files;
  if (files.some((file) => file.isPrimary)) return files;
  const preferredIndex = files.findIndex((file) => file.artifactType === "PRIMARY_REPORT");
  const primaryIndex = preferredIndex >= 0 ? preferredIndex : 0;
  return files.map((file, index) => ({ ...file, isPrimary: index === primaryIndex }));
}

export function useArtifactStaging() {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [fileRejections, setFileRejections] = useState<UploadFileRejection[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const filesRef = useRef<UploadFileItem[]>([]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles((prev) => {
      const { accepted, rejected } = validateIncomingFiles(list, prev);
      if (rejected.length > 0) setFileRejections(rejected);
      else if (accepted.length > 0) setFileRejections([]);
      if (accepted.length === 0) return prev;

      const next = [...prev];
      for (const f of accepted) {
        const meta = fileMeta(f, { existingFiles: next });
        if (!next.some((x) => x.id === meta.id)) next.push(meta);
      }
      return ensurePrimary(next);
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.objectUrl) URL.revokeObjectURL(target.objectUrl);
      const next = ensurePrimary(prev.filter((f) => f.id !== id));
      setPreviewId((pid) => (pid === id ? (next[0]?.id ?? null) : pid));
      return next;
    });
  }, []);

  const replaceFile = useCallback((id: string, file: File) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target) return prev;
      const others = prev.filter((f) => f.id !== id);
      const { accepted, rejected } = validateIncomingFiles([file], others);
      if (rejected.length > 0 || accepted.length === 0) {
        setFileRejections(rejected);
        return prev;
      }
      if (target.objectUrl) URL.revokeObjectURL(target.objectUrl);
      const replacement = fileMeta(accepted[0]!, {
        isPrimary: target.isPrimary,
        existingFiles: others,
      });
      const next = ensurePrimary(prev.map((f) => (f.id === id ? replacement : f)));
      setFileRejections([]);
      setPreviewId(replacement.id);
      return next;
    });
  }, []);

  const moveFile = useCallback((id: string, direction: "up" | "down") => {
    setFiles((prev) => {
      const index = prev.findIndex((file) => file.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item!);
      return next;
    });
  }, []);

  const makePrimary = useCallback((id: string) => {
    setFiles((prev) => prev.map((file) => ({ ...file, isPrimary: file.id === id })));
  }, []);

  const dismissFileRejections = useCallback(() => setFileRejections([]), []);

  const clearAll = useCallback(() => {
    setFiles((prev) => {
      for (const f of prev) {
        if (f.objectUrl) URL.revokeObjectURL(f.objectUrl);
      }
      return [];
    });
    setFileRejections([]);
    setPreviewId(null);
  }, []);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      for (const f of filesRef.current) {
        if (f.objectUrl) URL.revokeObjectURL(f.objectUrl);
      }
    };
  }, []);

  const validFiles = files.filter((f) => f.file);
  const previewFile = validFiles.find((f) => f.id === previewId) ?? validFiles[0] ?? null;

  return {
    files,
    validFiles,
    fileRejections,
    previewId,
    previewFile,
    setPreviewId,
    addFiles,
    removeFile,
    replaceFile,
    moveFile,
    makePrimary,
    dismissFileRejections,
    clearAll,
  };
}
