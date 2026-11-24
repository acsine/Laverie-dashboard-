"use client";

import { Breadcrumbs } from "@/components/ui";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

type Props = {
  email: string;
  role: string;
  kind: string;
  lavSiteId: string | null;
};

export function SettingsPage({ email, role, kind, lavSiteId }: Props) {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Paramètres" }]} />
      <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
      <dl className="grid gap-3 rounded-panel border border-line bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Compte</dt>
          <dd className="font-semibold">{email}</dd>
        </div>
        <div>
          <dt className="text-muted">Profil</dt>
          <dd className="font-semibold">
            {kind} · {role}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Site</dt>
          <dd className="font-semibold">{lavSiteId ?? "Tous (plateforme)"}</dd>
        </div>
      </dl>

      <section className="max-w-md space-y-3 rounded-panel border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold text-ink">Mot de passe</h2>
        <p className="text-sm text-muted">
          Modifiez votre mot de passe de connexion (cloud Supabase). Après changement, les appels API
          utilisent le nouveau mot de passe.
        </p>
        <ChangePasswordForm redirectTo="/systeme" successToast />
      </section>
    </div>
  );
}