"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fileItemVariants, baseTransition } from "@/lib/animations";

const COMMON_TLDS = [
  "com", "net", "org", "io", "dev", "app", "co", "ai", "edu", "gov",
  "info", "biz", "tv", "me", "eu", "uk", "de", "fr", "jp", "cn", "ca", "au",
  "xyz", "online", "site", "store", "blog", "tech", "news", "cloud", "page",
  "sh", "gg", "fyi", "ly", "to", "ws",
];
const TLD_GROUP = COMMON_TLDS.join("|");
const URL_REGEX = new RegExp(
  `(?:https?:\\/\\/|www\\.)[^\\s<>'")\\]]+|\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLD_GROUP})(?:\\/[^\\s<>'")\\]]*)?(?=[\\s.,;:!?)\\]<>'"]|$)`,
  "gi"
);

function normalizeHref(url: string): string {
  const trimmed = url.replace(/[.,;:!?]+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(normalizeHref(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

interface DetectedLinksProps {
  content: string;
}

export function DetectedLinks({ content }: DetectedLinksProps) {
  const urls = useMemo(() => dedupeUrls(content.match(URL_REGEX) ?? []), [content]);

  const visible = urls.slice(0, 2);
  const overflow = urls.slice(2);

  const chipClass =
    "flex items-center gap-1.5 rounded-sm bg-surface-container-high px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-surface-container-highest hover:text-foreground";

  return (
    <div className="absolute bottom-0 left-0 flex items-center gap-1.5">
      <AnimatePresence initial={false} mode="popLayout">
        {/* Desktop: inline chips for first 2 links */}
        {visible.map((url) => (
          <motion.a
            key={url}
            href={normalizeHref(url)}
            target="_blank"
            rel="noopener noreferrer"
            layout="position"
            variants={fileItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={baseTransition}
            className={`hidden sm:flex ${chipClass}`}
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="max-w-32 truncate">{extractDomain(url)}</span>
          </motion.a>
        ))}

        {/* Desktop: overflow dropdown (only when >2 links) */}
        {overflow.length > 0 && (
          <motion.div
            key="desktop-overflow"
            layout="position"
            variants={fileItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={baseTransition}
            className="hidden sm:block"
          >
            <DropdownMenu>
              <DropdownMenuTrigger className={`cursor-pointer ${chipClass}`}>
                +{overflow.length} more
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-max max-w-40">
                {overflow.map((url) => (
                  <DropdownMenuItem
                    key={url}
                    className="cursor-pointer"
                    onClick={() => window.open(normalizeHref(url), "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{extractDomain(url)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}

        {/* Mobile: single dropdown with all links */}
        {urls.length > 0 && (
          <motion.div
            key="mobile-summary"
            layout="position"
            variants={fileItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={baseTransition}
            className="sm:hidden"
          >
            <DropdownMenu>
              <DropdownMenuTrigger className={`cursor-pointer ${chipClass}`}>
                <ExternalLink className="h-3 w-3 shrink-0" />
                {urls.length} {urls.length === 1 ? "link" : "links"}
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-max max-w-40">
                {urls.map((url) => (
                  <DropdownMenuItem
                    key={url}
                    className="cursor-pointer"
                    onSelect={() => window.open(normalizeHref(url), "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{extractDomain(url)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
