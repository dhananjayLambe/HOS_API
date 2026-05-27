"use client";

import { labBtnPrimary, labMotion } from "@/components/labs/labDesignTokens";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderOpen, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type UploadDropzoneProps = {
  accept: string;
  onAddFiles: (files: FileList | File[]) => void;
};

export function UploadDropzone({ accept, onAddFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  return (
    <div className="space-y-1">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload report files"
        className={cn(
          "flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center",
          "border-[#B8A9FF] bg-[#FAF9FF] shadow-sm",
          labMotion,
          "transition-colors duration-200 hover:border-[#7C5CFC]/60 hover:bg-[#F8F7FF] hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/35",
          "motion-reduce:transform-none",
          isDragging && "scale-[1.01] border-[#7C5CFC] bg-[#F4F1FF] ring-2 ring-[#7C5CFC]/20",
        )}
        onKeyDown={handleKeyDown}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDragging(false);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          if (e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mb-2 h-8 w-8 text-[#7C5CFC]/70" aria-hidden />
        <Button
          type="button"
          size="sm"
          className={cn(labBtnPrimary, "h-9 gap-1.5 text-xs")}
          onClick={openPicker}
        >
          <FolderOpen className="h-4 w-4" aria-hidden />
          Choose files
        </Button>
        <p className="mt-2 text-xs text-[#6B7280]">or drag and drop reports here</p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="mt-1.5 text-[10px] text-[#9CA3AF]">PDF, JPG, PNG, CSV, XLSX, TXT, ZIP</p>
      </div>
    </div>
  );
}
