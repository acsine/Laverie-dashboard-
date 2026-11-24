/** Version client-safe de l'évaluation de force (sans bcrypt) */
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
