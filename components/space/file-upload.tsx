"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileUpload({ onFilesSelected }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      className={`flex flex-1 flex-col items-center justify-center rounded-lg bg-surface-container-low p-10 text-center ring-1 transition-colors ${
        dragging
          ? "ring-primary/40 bg-primary/5"
          : "ring-ghost-border"
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high">
        <Upload className="h-5 w-5 text-primary/70" />
      </div>
      <p className="font-heading text-sm font-medium">Upload Files</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Drag and drop your assets here
        <br />
        or click to browse files
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-md px-5 py-2 text-[10px] uppercase tracking-widest text-muted-foreground ring-1 ring-ghost-border transition-colors hover:text-foreground hover:ring-primary/30"
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
