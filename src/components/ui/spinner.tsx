import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label = "Chargement" }: Props) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-label={label} />;
}