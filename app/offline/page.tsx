import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low ring-1 ring-ghost-border">
        <WifiOff className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-6 font-heading text-2xl font-medium tracking-tight">
        you&apos;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Kliboard needs a connection to load and save spaces. Check your network
        and try again.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-sm bg-linear-to-br from-primary to-primary-container px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground shadow-md hover:opacity-90"
      >
        retry
      </Link>
    </div>
  );
}
