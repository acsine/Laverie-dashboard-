import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export function sha256(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Vérifie un mot de passe contre hash legacy SHA-256 ou bcrypt.
 * Retourne { ok, needsRehash } pour migration progressive.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(password, storedHash);
    return { ok, needsRehash: false };
  }

  const ok = sha256(password) === storedHash.toLowerCase();
  return { ok, needsRehash: ok };
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  ok: boolean;
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0 as PasswordStrength["score"];
  if (password.length >= 8) score = (score + 1) as PasswordStrength["score"];
  if (password.length >= 12) score = (score + 1) as PasswordStrength["score"];
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score = (score + 1) as PasswordStrength["score"];
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    score = Math.min(4, score + 1) as PasswordStrength["score"];
  }

  const labels = ["Très faible", "Faible", "Moyen", "Fort", "Très fort"] as const;
  return {
    score,
    label: labels[score],
    ok: password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password),
  };
}
