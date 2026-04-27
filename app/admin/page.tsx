"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminStats,
  useAdminSpaces,
  useAdminUsers,
  useAdminDeleteSpaces,
} from "@/hooks/use-admin";
import {
  LayoutDashboard,
  Database,
  Users,
  HardDrive,
  FileText,
  Infinity,
  Search,
  Trash2,
  ExternalLink,
  MoreVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Lock,
  LockOpen,
} from "lucide-react";

type Tab = "overview" | "spaces" | "users";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [spacePage, setSpacePage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedSpaces, setSelectedSpaces] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);

  const stats = useAdminStats();
  const spaces = useAdminSpaces(spacePage, search);
  const users = useAdminUsers();
  const deleteSpaces = useAdminDeleteSpaces();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, authLoading, isAdmin, router]);

  function handleSearch() {
    setSearch(searchInput);
    setSpacePage(1);
  }

  function toggleSpaceSelection(id: string) {
    setSelectedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (!deleteTarget?.length) return;
    try {
      await deleteSpaces.mutateAsync(deleteTarget);
      toast.success(`Deleted ${deleteTarget.length} space(s)`);
      setSelectedSpaces(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setDeleteTarget(null);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="font-heading text-2xl font-medium tracking-tight">Admin</h1>
      </div>

      <div className="mb-8 flex gap-1 rounded-lg bg-surface-container-low p-1">
        {(
          [
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "spaces", label: "Spaces", icon: Database },
            { key: "users", label: "Users", icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
              tab === key
                ? "bg-surface-container-high text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {stats.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : stats.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Total Spaces", value: stats.data.totalSpaces, icon: Database },
                { label: "Active Spaces", value: stats.data.activeSpaces, icon: Clock },
                { label: "Expired Spaces", value: stats.data.expiredSpaces, icon: Clock },
                { label: "Unlimited Spaces", value: stats.data.unlimitedSpaces, icon: Infinity },
                { label: "Total Files", value: stats.data.totalFiles, icon: FileText },
                { label: "Storage Used", value: formatBytes(stats.data.totalStorageBytes), icon: HardDrive },
                { label: "Total Users", value: stats.data.totalUsers, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-lg bg-surface-container-low p-5"
                >
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="font-heading text-2xl font-medium">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {tab === "spaces" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search spaces..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSearch}
              disabled={spaces.isFetching}
            >
              {spaces.isFetching && !spaces.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Search
            </Button>
            {selectedSpaces.size > 0 && (
              <Button
                variant="destructive"
                disabled={deleteSpaces.isPending}
                onClick={() => setDeleteTarget(Array.from(selectedSpaces))}
              >
                {deleteSpaces.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {deleteSpaces.isPending
                  ? `Deleting ${selectedSpaces.size}…`
                  : `Delete (${selectedSpaces.size})`}
              </Button>
            )}
          </div>

          {spaces.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div
                className={`space-y-1 transition-opacity ${spaces.isFetching ? "pointer-events-none opacity-60" : ""}`}
              >
                {spaces.data?.spaces.map((space, index) => {
                  const expired =
                    space.duration !== 0 &&
                    new Date(space.expires_at) < new Date();
                  const unlimited = space.duration === 0;
                  return (
                    <div
                      key={space.id}
                      className={`flex items-center gap-3 rounded-lg p-4 transition-colors hover:bg-surface-container ${
                        index % 2 === 0
                          ? "bg-surface-container-low"
                          : "bg-surface-dim"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSpaces.has(space.id)}
                        onChange={() => toggleSpaceSelection(space.id)}
                        className="h-4 w-4 shrink-0 rounded accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={`/space/${space.name}`}
                            className="font-heading font-medium tracking-tight hover:text-primary"
                          >
                            {space.name}
                          </Link>
                          <Badge variant="secondary">
                            {space.is_locked ? (
                              <>
                                <Lock className="mr-1 h-3 w-3" />
                                Locked
                              </>
                            ) : (
                              <>
                                <LockOpen className="mr-1 h-3 w-3" />
                                Open
                              </>
                            )}
                          </Badge>
                          {unlimited && (
                            <Badge variant="outline">
                              <Infinity className="mr-1 h-3 w-3" />
                              Unlimited
                            </Badge>
                          )}
                          {expired && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(space.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                          {space.content || "(empty)"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => router.push(`/space/${space.name}`)}
                            >
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Open space
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              className="cursor-pointer"
                              onClick={() => setDeleteTarget([space.id])}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
              {spaces.data && spaces.data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={spacePage <= 1 || spaces.isFetching}
                    onClick={() => setSpacePage((p) => p - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {spaces.isFetching && !spaces.isLoading ? (
                      <Loader2 className="inline h-3 w-3 animate-spin" />
                    ) : (
                      `${spacePage} / ${spaces.data.totalPages}`
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={spacePage >= spaces.data.totalPages || spaces.isFetching}
                    onClick={() => setSpacePage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "users" && (
        <div>
          {users.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <div
              className={`space-y-1 transition-opacity ${users.isFetching ? "opacity-60" : ""}`}
            >
              {users.data?.map((u, index) => (
                <div
                  key={u.id}
                  className={`flex items-center justify-between rounded-lg p-4 ${
                    index % 2 === 0
                      ? "bg-surface-container-low"
                      : "bg-surface-dim"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-medium">
                        {u.email}
                      </span>
                      {u.is_admin && (
                        <Badge className="border-0">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.space_count} space{u.space_count !== 1 ? "s" : ""}
                      {u.last_sign_in_at &&
                        ` · Last active ${formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true })}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Joined{" "}
                    {formatDistanceToNow(new Date(u.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (deleteSpaces.isPending) return;
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete spaces</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.length ?? 0} space(s)?
              This will permanently remove the spaces and all their files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSpaces.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleteSpaces.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSpaces.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {deleteSpaces.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
