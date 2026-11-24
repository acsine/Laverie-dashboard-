"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { loginAction } from "@/server/auth/login";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("error") === "site") {
      setError(
        "Votre compte doit être rattaché à une agence. Contactez le super admin pour corriger l'affectation.",
      );
    }
  }, [searchParams]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction({ email, password });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.step === "totp") {
        router.push("/login/2fa");
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:gap-5" noValidate>
      <Input
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="ex. admin@laverie.com"
        required
      />
      <Input
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Votre mot de passe"
        required
      />

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      {error && (
        <p
          className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        className="mt-0.5 h-11 w-full text-[15px] sm:h-12"
      >
        Se connecter
      </Button>
    </form>
  );
}
