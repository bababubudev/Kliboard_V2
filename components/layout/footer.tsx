import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto bg-surface-dim">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          kliboard &copy; {new Date().getFullYear()}
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="#"
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            privacy
          </Link>
          <Link
            href="#"
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            terms
          </Link>
          <Link
            href="#"
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            support
          </Link>
        </div>
      </div>
    </footer>
  );
}
