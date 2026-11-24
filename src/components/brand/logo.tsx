import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
};

/** Logo SALAM WASH STATION — asset partagé avec l'app mobile */
export function BrandLogo({ variant = "full", className, priority }: Props) {
  if (variant === "mark") {
    return (
      <Image
        src="/brand/logo-salam.jpg"
        alt="Salam Wash Station"
        width={40}
        height={40}
        unoptimized
        className={cn("h-9 w-9 shrink-0 object-contain object-center", className)}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/brand/logo-salam.jpg"
      alt="Salam Wash Station"
      width={320}
      height={200}
      unoptimized
      className={cn("h-auto w-full max-w-[280px] object-contain", className)}
      priority={priority}
    />
  );
}
