"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileUpload({ onFilesSelected }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;

      const accepted: File[] = [];
      for (const file of Array.from(fileList)) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          toast.error(`${file.name}: File type not allowed`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(`${file.name}: File too large (max 10MB)`);
          continue;
        }
        accepted.push(file);
      }

      if (accepted.length) onFilesSelected(accepted);
    },
    [onFilesSelected]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
      className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg p-8 text-center transition-colors hover:bg-surface-container"
    >
      <Upload className="mb-3 h-8 w-8 text-primary/60" />
      <p className="font-heading text-sm font-medium">Upload Files</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Drag and drop your assets here
        <br />
        or click to browse files
      </p>
      <button
        type="button"
        className="mt-4 rounded-md bg-surface-container-high px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-surface-bright hover:text-foreground"
      >
        Select Files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
