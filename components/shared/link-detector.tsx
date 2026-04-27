"use client";

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

interface LinkDetectorProps {
  text: string;
}

export function LinkDetector({ text }: LinkDetectorProps) {
  const parts: (string | { url: string; key: number })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  const regex = new RegExp(URL_REGEX);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ url: match[0], key: keyCounter++ });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <>
      {parts.map((part) =>
        typeof part === "string" ? (
          part
        ) : (
          <a
            key={part.key}
            href={normalizeHref(part.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {part.url}
          </a>
        )
      )}
    </>
  );
}
