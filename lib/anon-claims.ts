import { MAX_ANON_DURATION_MINUTES } from "@/lib/constants";

const STORAGE_KEY = "kliboard:anon-claims";
const MAX_AGE_MS = MAX_ANON_DURATION_MINUTES * 60 * 1000;

export interface AnonClaim {
  spaceName: string;
  token: string;
  createdAt: number;
}

function readRaw(): AnonClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is AnonClaim =>
        typeof entry?.spaceName === "string" &&
        typeof entry?.token === "string" &&
        typeof entry?.createdAt === "number"
    );
  } catch (err) {
    console.warn("Failed to read anon claims", err);
    return [];
  }
}

function writeRaw(claims: AnonClaim[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  } catch (err) {
    console.warn("Failed to persist anon claims", err);
  }
}

function pruneExpired(claims: AnonClaim[]): AnonClaim[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return claims.filter((c) => c.createdAt > cutoff);
}

export function getAnonClaims(): AnonClaim[] {
  const fresh = pruneExpired(readRaw());
  if (fresh.length !== readRaw().length) writeRaw(fresh);
  return fresh;
}

export function getClaimForSpace(spaceName: string): AnonClaim | undefined {
  return getAnonClaims().find(
    (c) => c.spaceName.toLowerCase() === spaceName.toLowerCase()
  );
}

export function addAnonClaim(spaceName: string, token: string) {
  const existing = readRaw().filter(
    (c) => c.spaceName.toLowerCase() !== spaceName.toLowerCase()
  );
  existing.push({ spaceName: spaceName.toLowerCase(), token, createdAt: Date.now() });
  writeRaw(pruneExpired(existing));
}

export function removeAnonClaim(spaceName: string) {
  const next = readRaw().filter(
    (c) => c.spaceName.toLowerCase() !== spaceName.toLowerCase()
  );
  writeRaw(next);
}
