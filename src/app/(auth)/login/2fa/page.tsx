import type { Metadata } from "next";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import {
  AuthFormPanel,
  AuthFormSurface,
} from "@/features/auth/components/auth-form-panel";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { TotpForm } from "@/features/auth/components/totp-form";

export const metadata: Metadata = { title: "Vérification 2FA" };

export default function TwoFactorPage() {
  return (
    <AuthPageShell>
      <AuthFormPanel>
        <AuthFormSurface>
          <AuthFormHeader
            title="Code de vérification"
            subtitle="Saisissez le code à 6 chiffres de votre application d'authentification."
          />
          <TotpForm />
        </AuthFormSurface>
      </AuthFormPanel>
    </AuthPageShell>
  );
}