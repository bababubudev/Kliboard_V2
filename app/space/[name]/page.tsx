"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { useBatchFileUpload } from "@/hooks/use-file-upload";
import { useAuth } from "@/hooks/use-auth";
import { FileUpload } from "@/components/space/file-upload";
import { FileList } from "@/components/space/file-list";
import type { PendingFile } from "@/components/space/file-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DeletionCountdown } from "@/components/space/deletion-countdown";
import { MAX_FILES_PER_SPACE } from "@/lib/constants";
import {
  NotepadText,
  LayoutGrid,
  List,
  EllipsisVertical,
  Lock,
  LockOpen,
  Info,
} from "lucide-react";

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
        savedSpace = await createSpace.mutateAsync({
          name,
          content,
          duration,
        });
        queryClient.setQueryData(["space", name], savedSpace);
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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
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
      <div className="mb-10 flex items-center justify-between">
        <div>
          {user && space ? (
            canToggleLock ? (
              <button
                onClick={handleToggleLock}
                disabled={toggleLock.isPending}
                className="flex cursor-pointer items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                {isLocked ? "Locked Space" : "Unlocked Space"}
              </button>
            ) : (
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {isLocked ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
                {isLocked ? "Locked Space" : "Unlocked Space"}
              </p>
            )
          ) : (
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Space
            </p>
          )}
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {decodeURIComponent(name)}
          </h1>
        </div>
        <div className="flex items-stretch overflow-hidden rounded-lg bg-surface-container-low">
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
          className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-6 ring-1 ring-ghost-border transition-shadow focus-within:ring-primary/30"
          onClick={(e) => {
            if (canModify && !(e.target as HTMLElement).closest("button")) {
              textareaRef.current?.focus();
            }
          }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NotepadText className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-heading text-sm font-medium">Add Note</p>
            </div>
            <div className="flex items-center gap-2">
              {statusText && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {statusText}
                </span>
              )}
              <div className="flex items-center">
                <div className={`flex items-center gap-3 overflow-hidden transition-all duration-200 ease-out ${menuOpen ? "max-w-48 mr-1 opacity-100" : "pointer-events-none max-w-0 opacity-0"}`}>
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
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            className="h-48 resize-none border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none field-sizing-fixed overflow-y-auto break-all placeholder:text-muted-foreground focus-visible:ring-0"
            placeholder="Start typing here..."
            value={content}
            onChange={(e) => canModify && setContent(e.target.value)}
            readOnly={!canModify}
          />
          <div className="mt-5 flex items-center justify-between">
            {!user && isNewSpace && (
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3 shrink-0" />
                Space will be read-only after saving
              </p>
            )}
            {batchUpload.isPending && batchUpload.progress.total > 0 && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Uploading {batchUpload.progress.completed}/{batchUpload.progress.total} files
              </p>
            )}
            <div className="relative ml-auto">
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
                className="cursor-pointer rounded-sm bg-linear-to-br from-primary to-primary-container px-7 py-3 text-xs font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving
                  ? "saving..."
                  : isNewSpace
                    ? "Save Space \u2192"
                    : "Update Space \u2192"}
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

      {(Boolean(space) || hasPendingFiles) && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="font-heading text-lg font-medium">Stored Items</p>
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
      )}

    </div>
  );
}
