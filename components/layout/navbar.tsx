"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Navbar() {
  const { user, loading } = useAuth();
  const { data: isAdmin } = useQuery({
    queryKey: ["admin-status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/admin");
      const data = await res.json();
      return data.isAdmin as boolean;
    },
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-dim/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-heading text-base font-medium tracking-tight text-foreground transition-colors hover:text-primary"
        >
          kliboard 2.0
        </Link>

        {!loading && user && (
          <div className="hidden items-center gap-5 sm:flex">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              my spaces
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                admin
              </Link>
            )}
            <span className="h-3.5 w-px bg-muted-foreground/25" />
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              logout
            </button>
          </div>
        )}

        {!loading && !user && (
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            sign in
          </Link>
        )}

        {!loading && user && (
          <div className="flex items-center gap-3 sm:hidden">
            <Tooltip>
              <TooltipTrigger
                render={<Link href="/dashboard" />}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                aria-label="My spaces"
              >
                <LayoutGrid className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>my spaces</TooltipContent>
            </Tooltip>
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger
                  render={<Link href="/admin" />}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Admin"
                >
                  <Shield className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>admin</TooltipContent>
              </Tooltip>
            )}
            <span className="h-3.5 w-px bg-muted-foreground/25" />
            <Tooltip>
              <TooltipTrigger
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>logout</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </header>
  );
}
