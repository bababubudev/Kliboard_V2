"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="sticky top-0 z-50 w-full bg-surface-dim/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-heading text-base font-medium tracking-tight text-foreground transition-colors hover:text-primary"
        >
          kliboard 2.0
        </Link>
        <div className="flex items-center gap-5">
          {!loading && user && (
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              my spaces
            </Link>
          )}
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
