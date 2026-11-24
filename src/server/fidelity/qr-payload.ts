import { createHash } from "crypto";

/** QR fidélité : hash inclut la validité (comme l’Edge, avec date de fin). */
export function buildQrPayloadHash(
  cardId: string,
  issuedAt: string,
  validUntil: string | null | undefined,
): string {
  const payload = `${cardId}|${issuedAt}|${validUntil ?? ""}`;
  return createHash("sha256").update(payload).digest("hex");
}