"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { verifyTotpAction } from "@/server/auth/login";
import { cn } from "@/lib/utils";

export function TotpForm() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = Array(6).fill("");
    text.split("").forEach((c, i) => {
      next[i] = c;
    });
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = digits.join("");
    startTransition(async () => {
      const result = await verifyTotpAction({ code });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.step === "change_password") {
        router.push("/change-password");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex justify-center gap-2" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            onChange={(e) => updateDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            aria-label={`Chiffre ${i + 1}`}
            className={cn(
              "h-12 w-11 rounded-control border border-line bg-surface text-center text-lg font-semibold tabular-nums",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
            )}
          />
        ))}
      </div>
      {error && (
        <p className="text-center text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={pending} disabled={digits.join("").length !== 6} className="w-full">
        Vérifier
      </Button>
    </form>
  );
}
