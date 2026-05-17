"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getAnonClaims, removeAnonClaim } from "@/lib/anon-claims";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClaimedSpace {
  id: string;
  name: string;
  content: string;
  is_locked: boolean;
  duration: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

async function claimOne(spaceName: string, token: string): Promise<ClaimedSpace | null> {
  try {
    const res = await fetch(`/api/spaces/${spaceName}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) return (await res.json()) as ClaimedSpace;
    const body = await res.text().catch(() => "");
    console.warn(`[anon-claim] ${spaceName} failed: HTTP ${res.status}`, body);
    if (res.status === 404 || res.status === 409 || res.status === 403) {
      removeAnonClaim(spaceName);
    }
    return null;
  } catch (err) {
    console.warn("[anon-claim] request failed", err);
    return null;
  }
}

export function AnonClaimRunner() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const lastUserId = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState<ClaimedSpace[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      lastUserId.current = null;
      return;
    }
    if (lastUserId.current === user.id) return;
    lastUserId.current = user.id;

    const pending = getAnonClaims();
    if (pending.length === 0) return;

    (async () => {
      const results = await Promise.all(
        pending.map((c) => claimOne(c.spaceName, c.token))
      );

      const successful: ClaimedSpace[] = [];
      results.forEach((space, idx) => {
        if (space) {
          successful.push(space);
          removeAnonClaim(pending[idx].spaceName);
        }
      });

      if (successful.length > 0) {
        setClaimed(successful);
        setOpen(true);

        queryClient.setQueryData<ClaimedSpace[]>(
          ["dashboard-spaces", user.id],
          (old) => {
            const existing = old ?? [];
            const merged = [
              ...successful.filter((s) => !existing.some((e) => e.id === s.id)),
              ...existing,
            ];
            return merged.sort(
              (a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          }
        );

        queryClient.invalidateQueries({ queryKey: ["dashboard-spaces"] });
        queryClient.invalidateQueries({ queryKey: ["recent-spaces"] });
        pending.forEach((c) => {
          queryClient.invalidateQueries({ queryKey: ["space", c.spaceName] });
        });
      }
    })();
  }, [user, loading, queryClient]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {claimed.length === 1 ? "1 space claimed" : `${claimed.length} spaces claimed`}
          </p>
          <DialogTitle className="text-xl">Linked to your account</DialogTitle>
          <DialogDescription>
            You can now manage these spaces from your dashboard.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {claimed.map((space) => (
            <li key={space.id}>
              <Link
                href={`/space/${space.name}`}
                onClick={() => setOpen(false)}
                className="group flex items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 transition-colors hover:bg-surface-container"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading font-medium text-foreground">
                    {space.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {space.content.trim() || "Empty space"}
                  </p>
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
