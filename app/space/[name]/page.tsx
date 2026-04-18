"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

function formatCountdown(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "expired";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function useCountdown(expiresAt?: string) {
  const [text, setText] = useState(() =>
    expiresAt ? formatCountdown(expiresAt) : ""
  );
  useEffect(() => {
    if (!expiresAt) return;
    setText(formatCountdown(expiresAt));
    const id = setInterval(() => setText(formatCountdown(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return text;
}
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSpace, useCreateSpace, useUpdateSpace, useToggleLock } from "@/hooks/use-space";
import { useBatchFileUpload, uploadFilesToStorage } from "@/hooks/use-file-upload";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/space/file-upload";
import { FileList } from "@/components/space/file-list";
import type { PendingFile } from "@/components/space/file-list";
const MarkdownRenderer = lazy(() => import("@/components/space/markdown-renderer").then((m) => ({ default: m.MarkdownRenderer })));
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeletionCountdown } from "@/components/space/deletion-countdown";
import { DetectedLinks } from "@/components/space/detected-links";
import { MAX_FILES_PER_SPACE } from "@/lib/constants";
import {
  NotepadText,
  LayoutGrid,
  List,
  EllipsisVertical,
  Lock,
  LockOpen,
  Info,
  NotebookPen,
  Download,
  Link,
  Check,
  X,
} from "lucide-react";

const MD_PATTERNS = [
  /^#{1,6}\s/m,
  /\*\*.+?\*\*/,
  /\[.+?\]\(.+?\)/,
  /^[-*+]\s/m,
  /^\d+\.\s/m,
  /^```/m,
  /^>\s/m,
  /^---$/m,
  /!\[.*?\]\(.*?\)/,
  /\|.+\|.+\|/,
];

function hasMarkdown(text: string): boolean {
  return MD_PATTERNS.some((p) => p.test(text));
}

export default function SpacePage() {
  const { name } = useParams<{ name: string }>();
  const { user } = useAuth();
  const {
    data: space,
    isLoading,
    error,
    refetch,
  } = useSpace(name);

  const [content, setContent] = useState("");
  const [duration, setDuration] = useState(5);
  const [prevSpaceId, setPrevSpaceId] = useState<string | null>(null);
  const [syncedContent, setSyncedContent] = useState("");
  const [syncedDuration, setSyncedDuration] = useState(5);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileViewMode, setFileViewMode] = useState<"grid" | "list">("grid");
  const [statusText, setStatusText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const statusTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const [nameClipped, setNameClipped] = useState(false);
  const [nameExpanded, setNameExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const measure = () => setNameClipped(el.scrollWidth > el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name, isLoading]);
  const countdown = useCountdown(space?.expires_at);

  function showStatus(text: string) {
    setStatusText(text);
    clearTimeout(statusTimeout.current);
    statusTimeout.current = setTimeout(() => setStatusText(""), 2000);
  }

  const queryClient = useQueryClient();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace(name);
  const toggleLock = useToggleLock(name);
  const batchUpload = useBatchFileUpload();
  const { data: remoteFiles } = useQuery({
    queryKey: ["files", space?.name ?? name],
    queryFn: async () => {
      const res = await fetch(`/api/spaces/${space?.name ?? name}/files`);
      if (!res.ok) return [];
      return res.json() as Promise<{ id: string }[]>;
    },
    enabled: Boolean(space),
  });

  if (space && prevSpaceId !== space.id) {
    setPrevSpaceId(space.id);
    setContent(space.content);
    setDuration(space.duration);
    setSyncedContent(space.content);
    setSyncedDuration(space.duration);
  }

  const is404 = error && (error as Error & { status?: number }).status === 404;
  const isNewSpace = is404;

  const isOwner = Boolean(user && space?.owner_id === user.id);
  const isLocked = space?.is_locked ?? true;
  const canModify = isNewSpace || isOwner || (Boolean(user) && !isLocked);
  const canToggleLock = isOwner;

  const hasPendingFiles = Boolean(pendingFiles.length);
  const hasContent = Boolean(content.trim());
  const canSave = hasContent || hasPendingFiles;
  const hasChanges = isNewSpace
    ? canSave
    : Boolean(
      space &&
      (content !== space.content ||
        duration !== space.duration ||
        pendingFiles.length > 0)
    );
  const isSaving =
    createSpace.isPending || updateSpace.isPending || batchUpload.isPending;

  const hasRemoteChanges = Boolean(
    space &&
    prevSpaceId === space.id &&
    (space.content !== syncedContent || space.duration !== syncedDuration)
  );

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const mapped: PendingFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "",
    }));
    setPendingFiles((prev) => [...prev, ...mapped]);
  }, []);

  function handleRemovePending(id: string) {
    setPendingFiles((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }


  async function handleSync() {
    const { data: fresh } = await refetch();
    if (fresh) {
      setContent(fresh.content);
      setDuration(fresh.duration);
      setSyncedContent(fresh.content);
      setSyncedDuration(fresh.duration);
    }
    showStatus("Synced");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      showStatus("Copied!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Copy failed";
      toast.error(msg);
    }
  }

  function handleDownloadMd() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${space?.name ?? name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadPdf() {
    const el = document.getElementById("md-preview-print");
    if (!el) {
      toast.error("Open preview first to download as PDF");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked — allow popups to download as PDF");
      return;
    }
    const title = space?.name ?? decodeURIComponent(name);
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1c1c1c;line-height:1.6}h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.5em}pre{background:#f5f5f4;padding:1rem;border-radius:4px;overflow-x:auto}code{background:#f5f5f4;padding:0.15em 0.4em;border-radius:3px;font-size:0.9em}pre code{background:none;padding:0}blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:1rem;color:#666}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:0.5rem;text-align:left}img{max-width:100%}@media print{body{margin:0;padding:0}}</style></head><body>${el.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.addEventListener("load", () => {
      printWindow.print();
      printWindow.close();
    });
  }

  const contentIsMarkdown = hasMarkdown(content);

  function handleSaveClick() {
    if (!canSave || !hasChanges) return;
    executeSave();
  }

  async function handleToggleLock() {
    try {
      await toggleLock.mutateAsync();
      toast.success(space?.is_locked ? "Space unlocked" : "Space locked");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle lock";
      toast.error(msg);
    }
  }

  async function executeSave() {
    try {
      let savedSpace = space;

      if (isNewSpace) {
        let filesMeta: { filename: string; storage_path: string; mime_type: string; size_bytes: number }[] | undefined;

        if (pendingFiles.length > 0) {
          const storageResults = await uploadFilesToStorage(
            pendingFiles.map((p) => p.file),
            name
          );
          const failed = storageResults.filter((r) => !r.success);
          if (failed.length) {
            for (const f of failed) toast.error(`${f.filename}: ${f.error}`);
          }
          filesMeta = storageResults
            .filter((r) => r.success)
            .map(({ filename, storage_path, mime_type, size_bytes }) => ({
              filename,
              storage_path,
              mime_type,
              size_bytes,
            }));
        }

        const created = await createSpace.mutateAsync({
          name,
          content,
          duration,
          files: filesMeta,
        });
        savedSpace = created;
        queryClient.setQueryData(["space", name], created);

        if (pendingFiles.length > 0) {
          await queryClient.invalidateQueries({ queryKey: ["files", created.name] });
          pendingFiles.forEach((p) => {
            if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          });
          setPendingFiles([]);
        }
      } else {
        const updates: {
          content?: string;
          duration?: number;
        } = {};
        if (content !== space!.content) updates.content = content;
        if (duration !== space!.duration) updates.duration = duration;
        if (Object.keys(updates).length > 0) {
          savedSpace = await updateSpace.mutateAsync(updates);
        }

        if (pendingFiles.length > 0 && savedSpace) {
          const results = await batchUpload.mutateAsync({
            files: pendingFiles.map((p) => p.file),
            spaceName: savedSpace.name,
            spaceId: savedSpace.id,
          });

          const failed = results.filter((r) => !r.success);
          if (failed.length) {
            for (const f of failed) {
              toast.error(`${f.filename}: ${f.error}`);
            }
          }

          await queryClient.invalidateQueries({ queryKey: ["files", savedSpace.name] });
          pendingFiles.forEach((p) => {
            if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          });
          setPendingFiles([]);
          batchUpload.resetProgress();
        }
      }

      setSyncedContent(content);
      setSyncedDuration(duration);
      toast.success("Space saved");
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 409) {
        await refetch();
        return;
      }
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <Skeleton className="mb-1.5 h-3 w-20" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="h-14 w-40 rounded-lg" />
        </div>
        <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg bg-surface-container-low p-6 ring-1 ring-ghost-border">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <div className="mt-32 flex justify-end">
              <Skeleton className="h-11 w-40 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-full min-h-50 rounded-lg" />
        </div>
        <div>
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-lg">
                <Skeleton className="aspect-square" />
                <div className="space-y-1.5 p-3">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !isNewSpace) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Something went wrong</p>
      </div>
    );
  }

  const existingFileCount = remoteFiles?.length ?? 0;
  const totalFileCount = existingFileCount + pendingFiles.length;
  const fileSlotsFull = totalFileCount >= MAX_FILES_PER_SPACE;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="relative min-w-0 pt-2">
          {user && space ? (
            canToggleLock ? (
              <button
                onClick={handleToggleLock}
                disabled={toggleLock.isPending}
                className="flex cursor-pointer items-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                &nbsp;
                {isLocked ? "Locked" : "Unlocked"}<span className="hidden sm:inline">&nbsp;Space</span>
              </button>
            ) : (
              <p className="flex items-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                &nbsp;
                {isLocked ? "Locked" : "Unlocked"}<span className="hidden sm:inline">&nbsp;Space</span>
              </p>
            )
          ) : (
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Space
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <h1
              ref={nameRef}
              onClick={() => nameClipped && setNameExpanded((v) => !v)}
              className={`truncate font-heading text-3xl font-medium tracking-tight ${nameClipped ? "cursor-pointer" : ""}`}
            >
              {decodeURIComponent(name)}
            </h1>
            {space && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard");
                  setShareCopied(true);
                  clearTimeout(shareTimeout.current);
                  shareTimeout.current = setTimeout(() => setShareCopied(false), 2000);
                }}
                className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
              >
                <Link className={`h-4 w-4 transition-all duration-200 ${shareCopied ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
                <Check className={`absolute h-4 w-4 text-primary transition-all duration-200 ${shareCopied ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
              </button>
            )}
          </div>
          {nameClipped && nameExpanded && (
            <p className="absolute left-0 z-10 mt-1 w-full break-all rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground shadow-md">
              {decodeURIComponent(name)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-stretch overflow-hidden rounded-lg bg-surface-container-low">
          <DeletionCountdown
            countdown={countdown}
            isSaved={Boolean(space)}
            duration={duration}
            onDurationChange={canModify ? setDuration : undefined}
          />
        </div>
      </div>

      <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div
          className="relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg bg-surface-container-low p-6 ring-1 ring-ghost-border transition-shadow focus-within:ring-primary/30"
          onClick={(e) => {
            if (canModify && !(e.target as HTMLElement).closest("button")) {
              textareaRef.current?.focus();
            }
          }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-heading text-sm font-medium"><span className="hidden sm:inline">Add </span>Note</p>
            </div>
            <div className="flex items-center gap-2">
              {statusText && !menuOpen && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {statusText}
                </span>
              )}
              {(content || space) && (
                <div className="flex items-center">
                  <div className={`flex items-center gap-3 overflow-hidden transition-all duration-200 ease-out ${menuOpen ? "max-w-48 mr-1 opacity-100" : "pointer-events-none max-w-0 opacity-0"}`}>
                    {content && contentIsMarkdown && (
                      <button
                        onClick={() => { setPreviewOpen(true); setMenuOpen(false); }}
                        className="mr-1 cursor-pointer whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Preview
                      </button>
                    )}
                    {content && (
                      <button
                        onClick={() => { handleCopy(); setMenuOpen(false); }}
                        className="mr-1 cursor-pointer whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Copy
                      </button>
                    )}
                    {space && (
                      <button
                        onClick={() => { handleSync(); setMenuOpen(false); }}
                        className="mr-1 cursor-pointer whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Sync
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                  >
                    <EllipsisVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            className="h-48 resize-none border-0 bg-transparent px-0 py-0 font-heading text-sm shadow-none field-sizing-fixed overflow-y-auto break-all placeholder:text-muted-foreground focus-visible:ring-0"
            placeholder="Start typing here..."
            value={content}
            onChange={(e) => canModify && setContent(e.target.value)}
            readOnly={!canModify}
          />
          {batchUpload.isPending && batchUpload.progress.total > 0 && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Uploading {batchUpload.progress.completed}/{batchUpload.progress.total} files
            </p>
          )}
          <div className="relative flex items-end justify-end gap-2">
            {(!user && isNewSpace) ? (
              <p className="mr-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3 shrink-0" />
                Space will be read-only<span className="hidden sm:inline">&nbsp;after saving</span>
              </p>
            ) : (
              <DetectedLinks content={content} />
            )}
            <div className="relative shrink-0">
              {!canModify && !isNewSpace && (
                <div className="absolute -inset-px z-10 flex items-center justify-center gap-1.5 rounded-sm bg-surface-container-low/90">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {!user ? "Log in to edit" : "Locked"}
                  </p>
                </div>
              )}
              <button
                onClick={handleSaveClick}
                disabled={!canModify || !canSave || !hasChanges || isSaving}
                className="flex h-10 cursor-pointer items-center justify-center rounded-sm bg-linear-to-br from-primary to-primary-container px-4 text-primary-foreground shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="whitespace-nowrap text-xs font-medium uppercase tracking-widest">
                  {isSaving
                    ? "saving..."
                    : isNewSpace
                      ? <>{`Save`}<span className="hidden sm:inline">&nbsp;Space</span>{` \u2192`}</>
                      : <>{`Update`}<span className="hidden sm:inline">&nbsp;Space</span>{` \u2192`}</>}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col">
          {!canModify && !isNewSpace && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-low/80 backdrop-blur-[2px]">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                {!user ? "Log in to upload files" : "Uploads locked by owner"}
              </p>
            </div>
          )}
          {fileSlotsFull ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-surface-container-low p-10 text-center ring-1 ring-ghost-border">
              <p className="text-sm font-medium text-muted-foreground">
                File limit reached
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Maximum {MAX_FILES_PER_SPACE} files per space
              </p>
            </div>
          ) : (
            <FileUpload
              onFilesSelected={handleFilesSelected}
              maxFiles={MAX_FILES_PER_SPACE - totalFileCount}
            />
          )}
        </div>
      </div>

      {
        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stored Items</p>
            <div className="flex items-center rounded-md bg-surface-container-high p-0.5">
              <button
                onClick={() => setFileViewMode("grid")}
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm transition-all ${fileViewMode === "grid"
                  ? "bg-surface-container text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFileViewMode("list")}
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm transition-all ${fileViewMode === "list"
                  ? "bg-surface-container text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <FileList
            spaceName={space?.name ?? name}
            canDelete={canModify && !isNewSpace}
            pendingFiles={pendingFiles}
            onRemovePending={handleRemovePending}
            viewMode={fileViewMode}
            uploading={batchUpload.isPending}
          />
        </div>
      }

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{space?.name ?? decodeURIComponent(name)}</DialogTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadMd}
                className="flex cursor-pointer items-center gap-1.5 rounded-md bg-surface-container px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                .md
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex cursor-pointer items-center gap-1.5 rounded-md bg-surface-container px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                .pdf
              </button>
              <DialogClose
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </div>
          <div id="md-preview-print" className="flex-1 overflow-y-auto pr-2">
            {previewOpen && (
              <Suspense fallback={
                <div className="space-y-3 py-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-8 w-full mt-4" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              }>
                <MarkdownRenderer content={content} />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
