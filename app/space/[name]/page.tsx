"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { useSpace, useCreateSpace, useUpdateSpace } from "@/hooks/use-space";
import { useBatchFileUpload } from "@/hooks/use-file-upload";
import { useAuth } from "@/hooks/use-auth";
import { SpacePasswordDialog } from "@/components/space/space-password-dialog";
import { SetPasswordDialog } from "@/components/space/set-password-dialog";
import { FileUpload } from "@/components/space/file-upload";
import { FileList } from "@/components/space/file-list";
import type { PendingFile } from "@/components/space/file-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DeletionCountdown } from "@/components/space/deletion-countdown";
import { VisibilityToggle } from "@/components/space/visibility-toggle";
import {
  NotepadText,
  LayoutGrid,
  List,
  EllipsisVertical,
} from "lucide-react";

export default function SpacePage() {
  const { name } = useParams<{ name: string }>();
  const [accessPassword, setAccessPassword] = useState<string | undefined>();
  const { user } = useAuth();
  const {
    data: space,
    isLoading,
    error,
    refetch,
  } = useSpace(name, accessPassword);

  const [content, setContent] = useState("");
  const [duration, setDuration] = useState(5);
  const [isPrivate, setIsPrivate] = useState(false);
  const [prevSpaceId, setPrevSpaceId] = useState<string | null>(null);
  const [syncedContent, setSyncedContent] = useState("");
  const [syncedDuration, setSyncedDuration] = useState(5);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
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
  const batchUpload = useBatchFileUpload();

  if (space && prevSpaceId !== space.id) {
    setPrevSpaceId(space.id);
    setContent(space.content);
    setDuration(space.duration);
    setIsPrivate(space.is_private);
    setSyncedContent(space.content);
    setSyncedDuration(space.duration);
  }

  const isPasswordProtected =
    error &&
    (error as Error & { passwordProtected?: boolean }).passwordProtected;
  const is404 = error && (error as Error & { status?: number }).status === 404;
  const isNewSpace = is404 && !isPasswordProtected;

  const hasPendingFiles = Boolean(pendingFiles.length);
  const hasContent = Boolean(content.trim());
  const canSave = hasContent || hasPendingFiles;
  const hasChanges = isNewSpace
    ? canSave
    : Boolean(
        space &&
          (content !== space.content ||
            duration !== space.duration ||
            isPrivate !== space.is_private ||
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

  function handlePasswordSubmit(pw: string) {
    setAccessPassword(pw);
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
    if (isPrivate && !space?.is_private) {
      setShowPasswordDialog(true);
      return;
    }
    executeSave();
  }

  async function handlePasswordSet(password: string) {
    setShowPasswordDialog(false);
    await executeSave(password);
  }

  async function executeSave(password?: string) {
    try {
      let savedSpace = space;

      if (isNewSpace) {
        savedSpace = await createSpace.mutateAsync({
          name,
          content,
          duration,
          password: password || undefined,
        });
        queryClient.setQueryData(["space", name, undefined], savedSpace);
      } else {
        const updates: {
          content?: string;
          duration?: number;
          password?: string;
        } = {};
        if (content !== space!.content) updates.content = content;
        if (duration !== space!.duration) updates.duration = duration;
        if (password) updates.password = password;
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

  if (isPasswordProtected && !space) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SpacePasswordDialog
          open={true}
          onSubmit={handlePasswordSubmit}
          error={accessPassword ? "Invalid password" : ""}
          loading={isLoading}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-44 w-full" />
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

  const isOwner = Boolean(user && space?.owner_id === user.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Space
          </p>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {decodeURIComponent(name)}
          </h1>
        </div>
        <div className="flex items-stretch overflow-hidden rounded-lg bg-surface-container-low">
          <DeletionCountdown
            countdown={countdown}
            isSaved={Boolean(space)}
            duration={duration}
            onDurationChange={setDuration}
          />
        </div>
      </div>

      <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div
          className="flex flex-col rounded-lg bg-surface-container-low p-6 ring-1 ring-ghost-border transition-[box-shadow] focus-within:ring-primary/30"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("button")) {
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
                      className="mr-1 whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Copy
                    </button>
                  )}
                  {space && (
                    <button
                      onClick={() => { handleSync(); setMenuOpen(false); }}
                      className="mr-1 whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Sync
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                >
                  <EllipsisVertical className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            className="h-48 resize-none border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none [field-sizing:fixed] overflow-y-auto break-all placeholder:text-muted-foreground focus-visible:ring-0"
            placeholder="Start typing your thoughts here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSaveClick}
              disabled={!canSave || !hasChanges || isSaving}
              className="rounded-sm bg-linear-to-br from-primary to-primary-container px-7 py-3 text-xs font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isSaving
                ? "saving..."
                : isNewSpace
                  ? "Save Space \u2192"
                  : "Update Space \u2192"}
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <FileUpload onFilesSelected={handleFilesSelected} />
        </div>
      </div>

      {(Boolean(space) || hasPendingFiles) && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="font-heading text-lg font-medium">Stored Items</p>
            <div className="flex items-center rounded-md bg-surface-container-high p-0.5">
              <button
                onClick={() => setFileViewMode("grid")}
                className={`flex h-7 w-7 items-center justify-center rounded-sm transition-all ${
                  fileViewMode === "grid"
                    ? "bg-surface-container text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFileViewMode("list")}
                className={`flex h-7 w-7 items-center justify-center rounded-sm transition-all ${
                  fileViewMode === "list"
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
            isOwner={isOwner}
            pendingFiles={pendingFiles}
            onRemovePending={handleRemovePending}
            viewMode={fileViewMode}
            uploading={batchUpload.isPending}
          />
        </div>
      )}

      <SetPasswordDialog
        open={showPasswordDialog}
        onSubmit={handlePasswordSet}
        onCancel={() => setShowPasswordDialog(false)}
        loading={isSaving}
      />
    </div>
  );
}
