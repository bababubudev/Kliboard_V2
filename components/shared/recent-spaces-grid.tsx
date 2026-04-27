"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentSpaces } from "@/hooks/use-space";
import { useAuth } from "@/hooks/use-auth";
import { fadeUp, baseTransition } from "@/lib/animations";
import { FileText, Paperclip, FolderOpen, CircleDashed, Lock, LockOpen } from "lucide-react";
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
  showLock,
}: {
  space: { id: string; name: string; content: string; file_count: number; updated_at: string; is_locked: boolean };
  showLock: boolean;
}) {
  const Icon = getIcon(!!space.content?.trim(), space.file_count > 0);
  return (
    <div className="group flex flex-col gap-3 rounded-lg bg-surface-container-low p-5 transition-colors hover:bg-surface-container">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        {showLock && (
          space.is_locked ? (
            <Lock className="h-3 w-3 text-muted-foreground/40" />
          ) : (
            <LockOpen className="h-3 w-3 text-muted-foreground/40" />
          )
        )}
      </div>
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
  const { user } = useAuth();
  const showLock = Boolean(user);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const hasMore = !isLoading && spaces && spaces.length > GRID_LIMIT;

  return (
    <>
      <div className="min-h-28">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : error || !spaces?.length ? (
          <div className="flex min-h-28 items-center justify-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">No recently visited spaces</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.slice(0, GRID_LIMIT).map((space, index) => (
              <motion.div
                key={space.id}
                variants={fadeUp}
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                transition={{ ...baseTransition, delay: reduceMotion ? 0 : index * 0.03 }}
              >
                <Link href={`/space/${space.name}`}>
                  <SpaceCard space={space} showLock={showLock} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
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
        <DialogContent className="flex max-h-[70dvh] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recent spaces</DialogTitle>
          </DialogHeader>
          <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
            <div className="flex flex-col gap-2">
              {spaces?.map((space) => (
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
                    <div className="flex shrink-0 items-center gap-2">
                      {showLock && (
                        space.is_locked ? (
                          <Lock className="h-3 w-3 text-muted-foreground/40" />
                        ) : (
                          <LockOpen className="h-3 w-3 text-muted-foreground/40" />
                        )
                      )}
                      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
                        {format(new Date(space.updated_at), "MMM d")}
                      </span>
                    </div>
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
