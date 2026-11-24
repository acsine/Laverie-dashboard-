"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, toast } from "@/components/ui";
import { changePasswordAction } from "@/server/auth/login";
import { PasswordStrengthMeter } from "./password-strength";

type Props = {
  redirectTo?: string;
  successToast?: boolean;
};

export function ChangePasswordForm({ redirectTo = "/", successToast = false }: Props) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (successToast) {
        toast("Mot de passe mis à jour", "success");
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <div className="space-y-2">
        <Input
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <PasswordStrengthMeter password={newPassword} />
      </div>
      <Input
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      {error && (
        <p className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        Enregistrer le mot de passe
      </Button>
    </form>
  );
}
