"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/hooks/use-auth";
import { useDeleteSpace } from "@/hooks/use-space";
import { createClient } from "@/lib/supabase/client";
import { Trash2, ExternalLink, Clock, Lock, LockOpen, Loader2 } from "lucide-react";

interface UserSpace {
  id: string;
  name: string;
  content: string;
  is_locked: boolean;
  duration: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const deleteSpace = useDeleteSpace();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const { data: spaces, isLoading } = useQuery({
    queryKey: ["dashboard-spaces", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("owner_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as UserSpace[];
    },
    enabled: Boolean(user),
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSpace.mutateAsync(deleteTarget);
      toast.success("Space deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete space";
      toast.error(message);
    } finally {
      setDeleteTarget(null);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-8 font-heading text-2xl font-medium tracking-tight">My Spaces</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !spaces?.length ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">You haven&apos;t created any spaces yet.</p>
          <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
            Create a Space
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {spaces.map((space, index) => {
            const expired = new Date(space.expires_at) < new Date();
            return (
              <div
                key={space.id}
                className={`group flex items-center justify-between rounded-lg p-5 transition-colors hover:bg-surface-container ${
                  index % 2 === 0 ? "bg-surface-container-low" : "bg-surface-dim"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/space/${space.name}`}
                      className="font-heading font-medium tracking-tight hover:text-primary"
                    >
                      {space.name}
                    </Link>
                    <Badge variant="secondary">
                      {space.is_locked ? (
                        <><Lock className="mr-1 h-3 w-3" />Locked</>
                      ) : (
                        <><LockOpen className="mr-1 h-3 w-3" />Unlocked</>
                      )}
                    </Badge>
                    {expired && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>
                  <p className="mt-1.5 truncate font-mono text-sm text-muted-foreground">
                    {space.content}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {expired
                      ? "Expired"
                      : `Expires ${formatDistanceToNow(new Date(space.expires_at), { addSuffix: true })}`}
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/space/${space.name}`} />}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(space.name)}
                    disabled={deleteSpace.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (deleteSpace.isPending) return;
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete space</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget}&rdquo;? This will permanently remove the space and all its files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSpace.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSpace.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSpace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteSpace.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
