"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderOpen } from "lucide-react";
import { useRef } from "react";

type UploadDropzoneProps = {
  accept: string;
  onAddFiles: (files: FileList | File[]) => void;
};

export function UploadDropzone({ accept, onAddFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D4CCFF] bg-[#FAFAFF] px-4 py-6 text-center",
          "hover:border-[#7C5CFC]/50 hover:bg-[#F8F7FF]",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files);
        }}
      >
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 border border-[#3D2499] bg-[#4A2DB8] text-xs hover:bg-[#3D2499]"
          onClick={() => inputRef.current?.click()}
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
