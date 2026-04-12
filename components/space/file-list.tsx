"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaceFiles } from "@/hooks/use-file-upload";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  FileText,
  FileSpreadsheet,
  FileIcon,
  Download,
  Share2,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";

export interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface FileRecord {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface FileListProps {
  spaceName: string;
  isOwner: boolean;
  pendingFiles: PendingFile[];
  onRemovePending: (id: string) => void;
  viewMode: "grid" | "list";
  uploading?: boolean;
}

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

function isImageFile(mimeType: string) {
  return IMAGE_TYPES.includes(mimeType);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileUrl(storagePath: string) {
  const supabase = createClient();
  const { data } = supabase.storage
    .from("space-files")
    .getPublicUrl(storagePath);
  return data.publicUrl;
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

async function handleDownload(file: FileRecord) {
  const url = getFileUrl(file.storage_path);
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    toast.error(msg);
  }
}

async function handleShare(file: FileRecord) {
  const url = getFileUrl(file.storage_path);
  if (navigator.share) {
    try {
      await navigator.share({ title: file.filename, url });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        await copyToClipboard(url);
      }
    }
  } else {
    await copyToClipboard(url);
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Copy failed";
    toast.error(msg);
  }
}

type UnifiedItem =
  | { kind: "remote"; data: FileRecord }
  | { kind: "pending"; data: PendingFile };

export function FileList({
  spaceName,
  isOwner,
  pendingFiles,
  onRemovePending,
  viewMode,
  uploading,
}: FileListProps) {
  const { deleteFile } = useSpaceFiles(spaceName);

  const { data: remoteFiles, isLoading } = useQuery({
    queryKey: ["files", spaceName],
    queryFn: async () => {
      const res = await fetch(`/api/spaces/${spaceName}/files`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? "Failed to load files");
      }
      return res.json() as Promise<FileRecord[]>;
    },
    enabled: Boolean(spaceName),
  });

  const items: UnifiedItem[] = useMemo(() => {
    const list: UnifiedItem[] = [];
    for (const p of pendingFiles) {
      list.push({ kind: "pending", data: p });
    }
    if (remoteFiles) {
      for (const r of remoteFiles) {
        list.push({ kind: "remote", data: r });
      }
    }
    return list;
  }, [pendingFiles, remoteFiles]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteRemote(file: FileRecord) {
    setDeletingId(file.id);
    try {
      await deleteFile.mutateAsync(file.id);
      toast.success(`${file.filename} deleted`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete file";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpenRemote(file: FileRecord) {
    window.open(getFileUrl(file.storage_path), "_blank");
  }

  if (isLoading && !pendingFiles.length) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          if (item.kind === "pending") {
            const { id, file } = item.data;
            const Icon = getFileTypeIcon(file.type);
            return (
              <div
                key={`pending-${id}`}
                className={`relative flex items-center gap-4 rounded-lg bg-surface-container-low px-4 py-3 transition-opacity ${uploading ? "opacity-50" : ""}`}
              >
                {uploading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-container-high">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.size)} &middot; {uploading ? "uploading" : "pending"}
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => onRemovePending(id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          }

          const file = item.data;
          const Icon = getFileTypeIcon(file.mime_type);
          const isDeleting = deletingId === file.id;
          return (
            <div
              key={`remote-${file.id}`}
              className={`group relative flex items-center gap-4 rounded-lg bg-surface-container-low px-4 py-3 transition-opacity ${isDeleting ? "opacity-50" : ""}`}
            >
              {isDeleting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-destructive">
                    Deleting
                  </p>
                </div>
              )}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-container-high">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.filename}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(file.size_bytes)} &middot;{" "}
                  {formatDistanceToNow(new Date(file.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className={`flex items-center gap-1 transition-opacity ${isDeleting ? "pointer-events-none opacity-0" : "opacity-0 group-hover:opacity-100"}`}>
                <button
                  onClick={() => handleOpenRemote(file)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleShare(file)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                {isOwner && (
                  <button
                    onClick={() => handleDeleteRemote(file)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => {
        if (item.kind === "pending") {
          const { id, file, previewUrl } = item.data;
          const isImage = isImageFile(file.type);
          const Icon = getFileTypeIcon(file.type);

          return (
            <div
              key={`pending-${id}`}
              className={`group relative flex flex-col overflow-hidden rounded-lg bg-surface-container-low transition-opacity ${uploading ? "opacity-60" : ""}`}
            >
              {uploading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-surface-container-low/80">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Uploading
                  </p>
                </div>
              )}
              <div className="relative aspect-square">
                {isImage ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {!uploading && (
                  <button
                    onClick={() => onRemovePending(id)}
                    className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="truncate font-heading text-xs font-medium">
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(file.size)} &middot; {uploading ? "uploading" : "pending"}
                </p>
              </div>
            </div>
          );
        }

        const file = item.data;
        const isImage = isImageFile(file.mime_type);
        const Icon = getFileTypeIcon(file.mime_type);
        const isDeleting = deletingId === file.id;

        return (
          <div
            key={`remote-${file.id}`}
            className={`group relative flex flex-col overflow-hidden rounded-lg bg-surface-container-low transition-opacity ${isDeleting ? "opacity-50" : ""}`}
          >
            {isDeleting ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-surface-container-low/80">
                <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-destructive">
                  Deleting
                </p>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 z-10 bg-black/0 transition-colors group-hover:bg-black/10" />
            )}
            <div
              className={`relative aspect-square overflow-hidden ${isDeleting ? "pointer-events-none" : "cursor-pointer"}`}
              onClick={() => !isDeleting && handleOpenRemote(file)}
            >
              {isImage ? (
                <Image
                  src={getFileUrl(file.storage_path)}
                  alt={file.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading={index < 4 ? "eager" : "lazy"}
                  unoptimized
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
                  <Icon className="h-10 w-10 text-muted-foreground" />
                  <p className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                    {file.filename}
                  </p>
                </div>
              )}
              {isImage && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-3 pt-6 pb-2">
                  <p className="font-mono text-[9px] text-white/70">
                    {formatFileSize(file.size_bytes)}
                  </p>
                </div>
              )}
            </div>
            <div className="relative p-3">
              <p className="truncate pr-20 font-heading text-xs font-medium">
                {file.filename}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {formatDistanceToNow(new Date(file.created_at), {
                  addSuffix: true,
                })}
              </p>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(file);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRemote(file);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
