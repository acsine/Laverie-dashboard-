"use client";

import { evaluatePasswordStrength } from "@/server/auth/password-strength-client";
import { cn } from "@/lib/utils";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = evaluatePasswordStrength(password);
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-line",
              password && i < score && colors[score],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted">{password ? label : "Saisissez un mot de passe"}</p>
    </div>
  );
}
