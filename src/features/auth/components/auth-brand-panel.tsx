import Image from "next/image";

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full min-h-0 w-full shrink-0 flex-col overflow-hidden md:flex md:w-1/2">
      <Image
        src="/brand/auth-hero.jpg"
        alt="Lavage automobile professionnel"
        fill
        priority
        unoptimized
        className="object-cover object-center"
        sizes="50vw"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020617]/92 via-[#020617]/45 to-[#020617]/25"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-full flex-col justify-between px-10 py-12 text-white">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-white/75 uppercase">
            Portail administration
          </p>
          <p className="mt-2 text-lg font-bold text-white">LAVERIE ADMIN</p>
        </div>

        <div className="max-w-md">
          <h1 className="text-[28px] leading-tight font-bold drop-shadow-sm">
            Pilotez toutes vos laveries en un seul endroit
          </h1>
          <p className="mt-3 text-sm text-white/80">
            Sites, équipes, commandes, finances et fidélité — console Salam Wash Station.
          </p>
        </div>

        <p className="text-xs text-white/55">
          Salam Wash Station · Laver c&apos;est notre affaire
        </p>
      </div>
    </div>
  );
}