"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentSpaces } from "@/hooks/use-space";
import { FolderOpen } from "lucide-react";

export function RecentSpacesGrid() {
  const { data: spaces, isLoading, error } = useRecentSpaces();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !spaces?.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {spaces.map((space) => (
        <Link key={space.id} href={`/space/${space.name}`}>
          <div className="group flex items-center gap-4 rounded-lg bg-surface-container-low p-5 transition-colors hover:bg-surface-container">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-container-high">
              <FolderOpen className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-medium">{space.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {formatDistanceToNow(new Date(space.updated_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
