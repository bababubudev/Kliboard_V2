import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export function generateClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyClaimToken(token: string, storedHash: string): boolean {
  const candidate = hashClaimToken(token);
  if (candidate.length !== storedHash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
  } catch {
    return false;
  }
}
