"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

export function FileUpload({ onFilesSelected, maxFiles }: FileUploadProps) {
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

      const limited = maxFiles !== undefined ? accepted.slice(0, maxFiles) : accepted;
      if (limited.length < accepted.length) {
        toast.error(`Only ${maxFiles} more file(s) allowed`);
      }
      if (limited.length) onFilesSelected(limited);
    },
    [onFilesSelected, maxFiles]
  );

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const files = e.clipboardData?.files;
      if (!files?.length) return;
      const hasImages = Array.from(files).some((f) => f.type.startsWith("image/"));
      if (!hasImages) return;
      e.preventDefault();
      handleFiles(files);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFiles]);

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
      className={`flex flex-1 flex-col items-center justify-center rounded-lg bg-surface-container-low p-10 text-center border border-dashed transition-colors ${
        dragging
          ? "border-primary/40 bg-primary/5"
          : "border-ghost-border"
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high">
        <Upload className="h-5 w-5 text-primary/70" />
      </div>
      <p className="font-heading text-sm font-medium">Upload Files</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Drag, drop, or paste images here
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-5 cursor-pointer rounded-md px-5 py-2 text-[10px] uppercase tracking-widest text-muted-foreground ring-1 ring-ghost-border transition-colors hover:text-foreground hover:ring-primary/30"
      >
        Browse Files
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
