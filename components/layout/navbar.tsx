"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const spaceMatch = pathname.match(/^\/space\/(.+)$/);
  const spaceName = spaceMatch?.[1];

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {spaceName ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="text-base font-bold text-primary hover:underline">
              kliboard
            </Link>
            <span>&gt;</span>
            <span>Space</span>
            <span>&gt;</span>
            <span className="font-medium text-foreground">{decodeURIComponent(spaceName)}</span>
          </div>
        ) : (
          <Link href="/" className="text-base font-bold text-primary">
            kliboard
          </Link>
        )}
        <div className="flex items-center gap-6">
          {!loading && user && (
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              spaces
            </Link>
          )}
          <ThemeToggle />
          {!loading && (
            <>
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  login
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
