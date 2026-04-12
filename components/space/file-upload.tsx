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
      className="flex cursor-pointer flex-col items-center justify-center rounded-lg p-8 text-center transition-colors hover:bg-secondary"
    >
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Upload Files</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Drag and drop documents or images
      </p>
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
