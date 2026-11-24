"use client";

import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-ink">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted">{error.message || "Erreur inattendue"}</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
