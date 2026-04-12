"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function formatCountdown(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "expired";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
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
import { DurationPicker } from "@/components/space/duration-picker";
import {
  Globe,
  Lock,
  RefreshCw,
  ArrowDownUp,
  Copy,
  EllipsisVertical,
  Pencil,
} from "lucide-react";

interface FileRecord {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const countdown = useCountdown(space?.expires_at);

  const queryClient = useQueryClient();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace(name);
  const batchUpload = useBatchFileUpload();

  const { data: files } = useQuery({
    queryKey: ["files", name],
    queryFn: async () => {
      const res = await fetch(`/api/spaces/${name}/files`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load files");
      }
      return res.json() as Promise<FileRecord[]>;
    },
    enabled: Boolean(space),
  });

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

  const hasFiles = Boolean(files?.length) || Boolean(pendingFiles.length);
  const hasContent = Boolean(content.trim());
  const canSave = hasContent || hasFiles;
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

  async function handleRefresh() {
    await refetch();
    toast.success("Refreshed");
  }

  function handleSync() {
    if (space) {
      setContent(space.content);
      setDuration(space.duration);
      setSyncedContent(space.content);
      setSyncedDuration(space.duration);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied");
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
        queryClient.invalidateQueries({ queryKey: ["space", name] });
      } else {
        const updates: {
          content?: string;
          duration?: number;
          password?: string;
        } = {};
        if (content !== space!.content) updates.content = content;
        if (duration !== space!.duration) updates.duration = duration;
        if (password) updates.password = password;
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

        pendingFiles.forEach((p) => {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        });
        setPendingFiles([]);
      }

      setSyncedContent(content);
      setSyncedDuration(duration);
      toast.success("Space saved");
    } catch (err) {
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
  const totalSize =
    (files?.reduce((sum, f) => sum + f.size_bytes, 0) ?? 0) +
    pendingFiles.reduce((sum, p) => sum + p.file.size, 0);
  const totalSizeStr =
    totalSize < 1024
      ? `${totalSize} B`
      : totalSize < 1024 * 1024
        ? `${(totalSize / 1024).toFixed(1)} KB`
        : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
  const itemCount = (files?.length ?? 0) + pendingFiles.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Space
          </p>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {decodeURIComponent(name)}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              time until deletion
            </p>
            <p className="font-heading text-xl font-medium tabular-nums">
              {space ? countdown : "unsaved"}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-1">
            <DurationPicker value={duration} onChange={setDuration} compact />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 items-center rounded-md p-0.5 transition-colors ${
                isPrivate
                  ? "bg-primary/15"
                  : "bg-surface-container-high"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex h-7 w-8 items-center justify-center rounded-sm transition-all ${
                  !isPrivate
                    ? "bg-surface-container text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex h-7 w-8 items-center justify-center rounded-sm transition-all ${
                  isPrivate
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg bg-surface-container-low p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-heading text-sm font-medium">Add Note</p>
            </div>
            <div className="flex items-center">
              <div
                className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ${
                  actionsOpen
                    ? "max-w-75 opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                {space && !hasRemoteChanges && (
                  <button
                    onClick={() => {
                      handleRefresh();
                      setActionsOpen(false);
                    }}
                    className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RefreshCw className="h-3 w-3" />
                    refresh
                  </button>
                )}
                {hasRemoteChanges && (
                  <button
                    onClick={() => {
                      handleSync();
                      setActionsOpen(false);
                    }}
                    className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary"
                  >
                    <ArrowDownUp className="h-3 w-3" />
                    sync
                  </button>
                )}
                {content && (
                  <button
                    onClick={() => {
                      handleCopy();
                      setActionsOpen(false);
                    }}
                    className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                    copy
                  </button>
                )}
                <span className="h-4 w-px shrink-0 bg-ghost-border" />
              </div>
              <button
                onClick={() => setActionsOpen((v) => !v)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Textarea
            className="min-h-45 resize-y border-0 bg-surface-container-high font-mono text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/30"
            placeholder="Start typing your thoughts here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSaveClick}
              disabled={!canSave || !hasChanges || isSaving}
              className="rounded-md bg-linear-to-br from-primary to-primary-container px-8 py-2.5 text-xs font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isSaving
                ? "saving..."
                : isNewSpace
                  ? "Save Note"
                  : "Update Note"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-surface-container-low p-6">
            <FileUpload onFilesSelected={handleFilesSelected} />
          </div>

          <div className="rounded-lg bg-surface-container-low p-5">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              storage info
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Size</span>
                <span className="font-mono font-medium">{totalSizeStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Count</span>
                <span className="font-mono font-medium">
                  {itemCount} items
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasFiles && (
        <div>
          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Stored Items
          </p>
          <FileList
            spaceName={space?.name ?? name}
            isOwner={isOwner}
            pendingFiles={pendingFiles}
            onRemovePending={handleRemovePending}
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
