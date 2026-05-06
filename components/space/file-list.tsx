"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useSpaceFiles } from "@/hooks/use-file-upload";
import { fileItemVariants, baseTransition, fadeIn, scaleReveal, screenFade } from "@/lib/animations";
import { SIGNED_URL_TTL_SECONDS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  X,
  FileText,
  FileSpreadsheet,
  FileIcon,
  Download,
  Share2,
  Trash2,
  Eye,
  Check,
  Loader2,
  EllipsisVertical,
} from "lucide-react";

export interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  exiting?: boolean;
  error?: string;
}

interface FileRecord {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  signed_url: string | null;
}

interface FileListProps {
  spaceName: string;
  canDelete: boolean;
  pendingFiles: PendingFile[];
  onRemovePending: (id: string) => void;
  viewMode: "grid" | "list";
  uploading?: boolean;
  spaceExists?: boolean;
  willEmptySpace?: boolean;
  onLastItemDeleted?: () => Promise<void> | void;
}

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function isImageFile(mimeType: string) {
  return IMAGE_TYPES.includes(mimeType);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(file: Pick<FileRecord, "signed_url">): string {
  return file.signed_url ?? "";
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

async function downloadFile(file: FileRecord) {
  const url = fileUrl(file);
  if (!url) throw new Error("File link unavailable");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

async function shareOrCopy(file: FileRecord): Promise<"shared" | "copied"> {
  const url = fileUrl(file);
  if (!url) throw new Error("File link unavailable");
  if (navigator.share) {
    try {
      await navigator.share({ title: file.filename, url });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "shared";
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

function FadeInImage({
  src,
  alt,
  fill,
  sizes,
  className,
  loading,
  unoptimized,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  loading?: "eager" | "lazy";
  unoptimized?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {!loaded && (
          <motion.div
            key="skeleton"
            variants={fadeIn}
            initial="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-1"
          >
            <Skeleton className="h-full w-full rounded-none" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        variants={scaleReveal}
        initial="hidden"
        animate={loaded ? "visible" : "hidden"}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full w-full"
      >
        <Image
          src={src}
          alt={alt}
          fill={fill}
          sizes={sizes}
          className={className}
          loading={loading}
          unoptimized={unoptimized}
          onLoad={() => setLoaded(true)}
        />
      </motion.div>
    </div>
  );
}

function FileActionsMenu({
  file,
  canDelete,
  willEmptySpace = false,
  onOpen,
  onDownload,
  onShare,
  onDelete,
  isDeleting = false,
  isDownloading = false,
  isCopied = false,
}: {
  file: FileRecord;
  canDelete: boolean;
  willEmptySpace?: boolean;
  onOpen: (file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onShare: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
  isCopied?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isDeleting) setConfirmDelete(false);
  }, [isDeleting]);

  function handleConfirmDelete() {
    onDelete(file);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground">
          <EllipsisVertical className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer" onClick={() => onOpen(file)}>
            <Eye className="mr-2 h-3.5 w-3.5" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={isDownloading}
            onClick={() => onDownload(file)}
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-2 h-3.5 w-3.5" />
            )}
            {isDownloading ? "Downloading…" : "Download"}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => onShare(file)}>
            {isCopied ? (
              <Check className="mr-2 h-3.5 w-3.5 text-primary" />
            ) : (
              <Share2 className="mr-2 h-3.5 w-3.5" />
            )}
            {isCopied ? "Link copied" : "Share"}
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !isDeleting && setConfirmDelete(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{willEmptySpace ? "Delete file and space" : "Delete file"}</AlertDialogTitle>
            <AlertDialogDescription>
              {willEmptySpace
                ? <>Deleting &ldquo;{file.filename}&rdquo; will leave the space empty, so the space will be deleted too. This action cannot be undone.</>
                : <>Are you sure you want to delete &ldquo;{file.filename}&rdquo;? This action cannot be undone.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isDeleting ? "Deleting..." : willEmptySpace ? "Delete space" : "Delete"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type UnifiedItem =
  | { kind: "remote"; data: FileRecord }
  | { kind: "pending"; data: PendingFile };

export function FileList({
  spaceName,
  canDelete,
  pendingFiles,
  onRemovePending,
  viewMode,
  uploading,
  spaceExists,
  willEmptySpace = false,
  onLastItemDeleted,
}: FileListProps) {
  const { deleteFile } = useSpaceFiles(spaceName);
  const queryClient = useQueryClient();

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
    staleTime: (SIGNED_URL_TTL_SECONDS - 600) * 1000,
    refetchOnWindowFocus: true,
  });

  const items: UnifiedItem[] = useMemo(() => {
    const remoteKeys = new Set<string>();
    if (remoteFiles) {
      for (const r of remoteFiles) {
        remoteKeys.add(`${r.filename}-${r.size_bytes}`);
      }
    }
    const list: UnifiedItem[] = [];
    for (const p of pendingFiles) {
      const k = `${p.file.name}-${p.file.size}`;
      if (!remoteKeys.has(k)) {
        list.push({ kind: "pending", data: p });
      }
    }
    if (remoteFiles) {
      for (const r of remoteFiles) {
        list.push({ kind: "remote", data: r });
      }
    }
    return list;
  }, [pendingFiles, remoteFiles]);

  function itemKey(item: UnifiedItem): string {
    return item.kind === "pending"
      ? `file-${item.data.file.name}-${item.data.file.size}`
      : `file-${item.data.filename}-${item.data.size_bytes}`;
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleShare(file: FileRecord) {
    try {
      const result = await shareOrCopy(file);
      if (result === "copied") {
        setCopiedId(file.id);
        toast.success("Link copied");
        setTimeout(() => {
          setCopiedId((prev) => (prev === file.id ? null : prev));
        }, 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Copy failed";
      toast.error(msg);
    }
  }

  async function handleDownload(file: FileRecord) {
    setDownloadingId(file.id);
    try {
      await downloadFile(file);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDeleteRemote(file: FileRecord) {
    setDeletingId(file.id);
    const wasLast = willEmptySpace;
    try {
      await deleteFile.mutateAsync(file.id);
      if (wasLast && onLastItemDeleted) {
        await onLastItemDeleted();
      } else {
        toast.success(`${file.filename} deleted`);
        await queryClient.invalidateQueries({ queryKey: ["files", spaceName] });
      }
      setDeletingId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete file";
      toast.error(message);
      setDeletingId(null);
    }
  }

  function handleOpenRemote(file: FileRecord) {
    const url = fileUrl(file);
    if (!url) {
      toast.error("File link unavailable");
      return;
    }
    window.open(url, "_blank");
  }

  if (isLoading && !pendingFiles.length) {
    if (!spaceExists) return null;
    return (
      <motion.div
        variants={screenFade}
        initial="hidden"
        animate="visible"
        className={viewMode === "grid"
          ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          : "flex flex-col gap-2"
        }
      >
        {viewMode === "grid"
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-lg">
              <Skeleton className="aspect-4/3" />
              <div className="space-y-1.5 p-3">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          ))
          : Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
      </motion.div>
    );
  }

  if (!items.length) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={baseTransition}
        className="py-10 text-center"
      >
        <p className="font-heading text-sm text-muted-foreground">Nothing yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Previews will appear here</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {viewMode === "list" ? (
        <motion.div
          key="list-view"
          variants={screenFade}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col gap-2"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item) => {
              if (item.kind === "pending") {
                const { id, file, exiting } = item.data;
                const Icon = getFileTypeIcon(file.type);
                return (
                  <motion.div
                    key={itemKey(item)}
                    layout="position"
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={baseTransition}
                    className={`relative flex items-center gap-4 rounded-lg bg-surface-container-low px-4 py-3 ${uploading ? "opacity-60" : ""}`}
                  >
                    {uploading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg">
                        {exiting ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-primary" />
                            <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Done</p>
                          </>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
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
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </motion.div>
                );
              }

              const file = item.data;
              const Icon = getFileTypeIcon(file.mime_type);
              const isDeleting = deletingId === file.id;
              return (
                <motion.div
                  key={itemKey(item)}
                  layout="position"
                  variants={fileItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={baseTransition}
                  className={`group relative flex items-center gap-4 rounded-lg bg-surface-container-low px-4 py-3 ${isDeleting ? "opacity-50" : ""}`}
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
                  <div className={`transition-opacity ${isDeleting ? "pointer-events-none opacity-0" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}>
                    <FileActionsMenu file={file} canDelete={canDelete} willEmptySpace={willEmptySpace} onOpen={handleOpenRemote} onDownload={handleDownload} onShare={handleShare} onDelete={handleDeleteRemote} isDeleting={deletingId === file.id} isDownloading={downloadingId === file.id} isCopied={copiedId === file.id} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          key="grid-view"
          variants={screenFade}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, index) => {
              if (item.kind === "pending") {
                const { id, file, previewUrl, exiting } = item.data;
                const isImage = isImageFile(file.type);
                const Icon = getFileTypeIcon(file.type);

                return (
                  <motion.div
                    key={itemKey(item)}
                    layout="position"
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={baseTransition}
                    className="group relative flex flex-col overflow-hidden rounded-lg bg-surface-container-low"
                  >
                    {uploading && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-surface-container-low/80">
                        {exiting ? (
                          <>
                            <Check className="h-5 w-5 text-primary" />
                            <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Done</p>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Uploading</p>
                          </>
                        )}
                      </div>
                    )}
                    <div className="relative aspect-4/3 overflow-hidden">
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
                          className="absolute top-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-100 transition-opacity hover:bg-black/70 md:h-5 md:w-5 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="relative p-3">
                      <p className="truncate font-heading text-xs font-medium">
                        {file.name}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        {formatFileSize(file.size)} &middot; {uploading ? "uploading" : "pending"}
                      </p>
                    </div>
                  </motion.div>
                );
              }

              const file = item.data;
              const isImage = isImageFile(file.mime_type);
              const Icon = getFileTypeIcon(file.mime_type);
              const isDeleting = deletingId === file.id;

              return (
                <motion.div
                  key={itemKey(item)}
                  layout="position"
                  variants={fileItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={baseTransition}
                  className={`group relative flex flex-col overflow-hidden rounded-lg bg-surface-container-low ${isDeleting ? "opacity-50" : ""}`}
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
                    className={`relative aspect-4/3 overflow-hidden ${isDeleting ? "pointer-events-none" : "cursor-pointer"}`}
                    onClick={() => !isDeleting && handleOpenRemote(file)}
                  >
                    {isImage && file.signed_url ? (
                      <FadeInImage
                        src={file.signed_url}
                        alt={file.filename}
                        fill
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
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
                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                      <FileActionsMenu file={file} canDelete={canDelete} willEmptySpace={willEmptySpace} onOpen={handleOpenRemote} onDownload={handleDownload} onShare={handleShare} onDelete={handleDeleteRemote} isDeleting={deletingId === file.id} isDownloading={downloadingId === file.id} isCopied={copiedId === file.id} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
