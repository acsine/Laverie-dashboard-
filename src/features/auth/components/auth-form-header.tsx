import { BrandLogo } from "@/components/brand/logo";

type Props = {
  title: string;
  subtitle?: string;
};

export function AuthFormHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-5 flex flex-col items-center text-center sm:mb-7 md:mb-8">
      <BrandLogo className="max-w-[88px] sm:max-w-[100px] md:max-w-[112px]" priority />
      <h1 className="mt-4 text-xl font-bold tracking-tight text-ink sm:mt-5 sm:text-2xl lg:text-[26px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-md text-sm text-muted lg:text-[15px]">{subtitle}</p>
      ) : null}
    </div>
  );
}