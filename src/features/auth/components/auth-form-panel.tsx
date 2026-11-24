type AuthFormPanelProps = {
  children: React.ReactNode;
};

/** Colonne droite connexion — occupe 50 % de l’écran sur grand format */
export function AuthFormPanel({ children }: AuthFormPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col md:w-1/2 md:shrink-0 md:grow-0">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-softer via-surface to-bg"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-20 right-[-10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-5%] left-[-5%] h-56 w-56 rounded-full bg-primary-light/50 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-5 py-6 sm:px-10 sm:py-8 md:px-14 lg:px-20 xl:px-24 2xl:px-28">
          <div className="w-full max-w-md mx-auto">{children}</div>
        </div>

        <p className="hidden shrink-0 px-5 pb-6 text-center text-xs text-muted sm:block sm:px-10 md:px-14 md:pb-8 lg:px-20 xl:px-24 2xl:px-28">
          Salam Wash Station · Laver c&apos;est notre affaire
        </p>
      </div>
    </div>
  );
}

/** Conteneur formulaire sans carte ni bordure */
export function AuthFormSurface({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}