"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentSpaces } from "@/hooks/use-space";
import { FileText, Paperclip, FolderOpen, CircleDashed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GRID_LIMIT = 6;

function getIcon(hasText: boolean, hasFiles: boolean) {
  if (hasText && hasFiles) return FolderOpen;
  if (hasFiles) return Paperclip;
  if (hasText) return FileText;
  return CircleDashed;
}

function getDescription(content: string | null, fileCount: number): string {
  if (content?.trim()) {
    const firstLine = content.trim().split("\n")[0];
    return firstLine.length > 40 ? firstLine.slice(0, 40) + "…" : firstLine;
  }
  if (fileCount > 0) {
    return `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  }
  return "Empty space";
}

function SpaceCard({
  space,
}: {
  space: { id: string; name: string; content: string; file_count: number; updated_at: string };
}) {
  const Icon = getIcon(!!space.content?.trim(), space.file_count > 0);
  return (
    <div className="group flex flex-col gap-3 rounded-lg bg-surface-container-low p-5 transition-colors hover:bg-surface-container">
      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-medium">
            {space.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {getDescription(space.content, space.file_count)}
          </p>
        </div>
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
          {format(new Date(space.updated_at), "MMM d")}
        </span>
      </div>
    </div>
  );
}

export function RecentSpacesGrid() {
  const { data: spaces, isLoading, error } = useRecentSpaces();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !spaces?.length) return null;

  const hasMore = spaces.length > GRID_LIMIT;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.slice(0, GRID_LIMIT).map((space) => (
          <Link key={space.id} href={`/space/${space.name}`}>
            <SpaceCard space={space} />
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            Show all spaces
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[70vh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Public spaces</DialogTitle>
          </DialogHeader>
          <div className="-mx-5 overflow-y-auto px-5">
            <div className="flex flex-col gap-2">
              {spaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/space/${space.name}`}
                  onClick={() => setOpen(false)}
                >
                  <div className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-container">
                    {(() => {
                      const Icon = getIcon(!!space.content?.trim(), space.file_count > 0);
                      return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />;
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-sm font-medium">
                        {space.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getDescription(space.content, space.file_count)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
                      {format(new Date(space.updated_at), "MMM d")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
