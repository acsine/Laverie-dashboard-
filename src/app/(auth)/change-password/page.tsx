import type { Metadata } from "next";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import {
  AuthFormPanel,
  AuthFormSurface,
} from "@/features/auth/components/auth-form-panel";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = { title: "Changer le mot de passe" };

export default function ChangePasswordPage() {
  return (
    <AuthPageShell>
      <AuthFormPanel>
        <AuthFormSurface>
          <AuthFormHeader
            title="Nouveau mot de passe"
            subtitle="Choisissez un mot de passe fort avant de continuer."
          />
          <ChangePasswordForm />
        </AuthFormSurface>
      </AuthFormPanel>
    </AuthPageShell>
  );
}