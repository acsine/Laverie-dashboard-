export const ROLE_LABELS = {
  admin: "Administrateur",
  manager: "Gérant",
  cashier: "Caissier",
  washer: "Laveur",
} as const;

export const CONTRACT_LABELS = {
  monthly: "Mensuel",
  perVehicle: "Par véhicule",
} as const;

export function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role;
}

export function contractLabel(contract: string): string {
  return (CONTRACT_LABELS as Record<string, string>)[contract] ?? contract;
}

export function roleNeedsLogin(role: string): boolean {
  return role === "admin" || role === "manager";
}