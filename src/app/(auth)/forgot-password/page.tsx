import type { Metadata } from "next";
import Link from "next/link";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import {
  AuthFormPanel,
  AuthFormSurface,
} from "@/features/auth/components/auth-form-panel";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <AuthFormPanel>
        <AuthFormSurface>
          <AuthFormHeader title="Mot de passe oublié" />
          <p className="mb-6 text-sm text-muted">
            La réinitialisation par e-mail sera disponible prochainement. Contactez un
            administrateur plateforme pour réinitialiser votre accès.
          </p>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-control bg-primary text-sm font-medium text-white hover:bg-primary-dark md:h-[52px] md:text-base"
          >
            Retour à la connexion
          </Link>
        </AuthFormSurface>
      </AuthFormPanel>
    </AuthPageShell>
  );
}