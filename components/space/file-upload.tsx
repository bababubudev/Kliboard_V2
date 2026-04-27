"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Upload, X, FileText, FileSpreadsheet, FileIcon, Check } from "lucide-react";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { fileItemVariants, baseTransition } from "@/lib/animations";
import type { PendingFile } from "@/components/space/file-list";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return FileSpreadsheet;
  if (mimeType.includes("word") || mimeType === "text/markdown") return FileText;
  return FileIcon;
}

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  pendingFiles?: PendingFile[];
  onRemovePending?: (id: string) => void;
  uploading?: boolean;
  full?: boolean;
  progress?: { completed: number; total: number };
}

export function FileUpload({ onFilesSelected, maxFiles, pendingFiles = [], onRemovePending, uploading, full, progress }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();

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
      className={`relative flex flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-low border border-dashed transition-colors ${
        dragging
          ? "border-primary/40 bg-primary/5"
          : "border-ghost-border"
      } ${pendingFiles.length > 0 ? "p-4" : "items-center justify-center p-10 text-center"}`}
    >
      {dragging && pendingFiles.length > 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-low/90 backdrop-blur-[2px]">
          <Upload className="h-5 w-5 text-primary/70" />
          <p className="text-xs font-medium text-muted-foreground">Drop files here</p>
        </div>
      )}
      {pendingFiles.length > 0 || uploading ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {uploading && progress && progress.total > 0
                ? `Uploading ${progress.completed} / ${progress.total}`
                : `${pendingFiles.length} file${pendingFiles.length !== 1 ? "s" : ""} ready`}
            </p>
            {!full && !uploading && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Add more
              </button>
            )}
          </div>
          {uploading && progress && progress.total > 0 && (
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                style={{
                  width: `${Math.min(100, (progress.completed / progress.total) * 100)}%`,
                }}
              />
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
            <AnimatePresence initial={false} mode="popLayout">
              {(uploading ? [] : pendingFiles).map(({ id, file, exiting }) => {
                const Icon = getFileTypeIcon(file.type);
                return (
                  <motion.div
                    key={id}
                    layout={reduceMotion ? false : "position"}
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={baseTransition}
                    className="flex min-w-0 items-center gap-3 rounded-md bg-surface-container-high/50 px-3 py-2"
                  >
                    {exiting ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <p className="min-w-0 flex-1 truncate text-xs">{file.name}</p>
                    <p className="shrink-0 text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                    {!exiting && onRemovePending && (
                      <button
                        onClick={() => onRemovePending(id)}
                        className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : full ? (
        <>
          <p className="text-sm font-medium text-muted-foreground">File limit reached</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Maximum files per space</p>
        </>
      ) : (
        <>
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
        </>
      )}
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
