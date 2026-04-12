"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaceFiles } from "@/hooks/use-file-upload";
import { createClient } from "@/lib/supabase/client";
import { X, FileText, FileSpreadsheet, FileIcon, Grid2x2, List } from "lucide-react";

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
  const { data } = supabase.storage.from("space-files").getPublicUrl(storagePath);
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

type UnifiedItem =
  | { kind: "remote"; data: FileRecord }
  | { kind: "pending"; data: PendingFile };

export function FileList({
  spaceName,
  isOwner,
  pendingFiles,
  onRemovePending,
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

  async function handleDeleteRemote(file: FileRecord) {
    try {
      await deleteFile.mutateAsync(file.id);
      toast.success(`${file.filename} deleted`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete file";
      toast.error(message);
    }
  }

  function handleOpenRemote(file: FileRecord) {
    window.open(getFileUrl(file.storage_path), "_blank");
  }

  if (isLoading && !pendingFiles.length) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => {
        if (item.kind === "pending") {
          const { id, file, previewUrl } = item.data;
          const isImage = isImageFile(file.type);
          const Icon = getFileTypeIcon(file.type);

          return (
            <div
              key={`pending-${id}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-primary/30 bg-card"
            >
              {isImage ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <p className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                    {file.name}
                  </p>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="truncate font-mono text-[10px] text-white">
                  {file.name}
                </p>
                <p className="font-mono text-[9px] text-white/60">
                  {formatFileSize(file.size)} &middot; pending
                </p>
              </div>
              <button
                onClick={() => onRemovePending(id)}
                className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        }

        const file = item.data;
        const isImage = isImageFile(file.mime_type);
        const Icon = getFileTypeIcon(file.mime_type);

        return (
          <div
            key={`remote-${file.id}`}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border/50 bg-card"
            onClick={() => handleOpenRemote(file)}
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
              <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <p className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                  {file.filename}
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="truncate font-mono text-[10px] text-white">
                {file.filename}
              </p>
              <p className="font-mono text-[9px] text-white/60">
                {formatFileSize(file.size_bytes)}
              </p>
            </div>
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRemote(file);
                }}
                className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
