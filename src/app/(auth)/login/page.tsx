import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";
import {
  AuthFormPanel,
  AuthFormSurface,
} from "@/features/auth/components/auth-form-panel";
import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthFormPanel>
        <AuthFormSurface>
          <AuthFormHeader
            title="Connexion"
            subtitle="Portail d'administration — accédez à votre console multi-sites."
          />
          <Suspense
            fallback={
              <div className="flex flex-col gap-4 sm:gap-5" aria-hidden>
                <div className="h-12 rounded-control bg-line/40 animate-pulse" />
                <div className="h-12 rounded-control bg-line/40 animate-pulse" />
                <div className="mt-2 h-12 rounded-control bg-line/50 animate-pulse" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </AuthFormSurface>
      </AuthFormPanel>
    </AuthPageShell>
  );
}