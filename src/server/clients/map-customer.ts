export type CustomerRowDto = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  clientNumber: string;
  country: string;
  matricule: string;
  marque: string;
  isActive: boolean;
  createdAt: string;
  lavSiteId: string | null;
};

export function mapCustomerRow(c: Record<string, unknown>): CustomerRowDto {
  return {
    id: String(c.id),
    firstName: String(c.firstName ?? c.first_name ?? ""),
    lastName: String(c.lastName ?? c.last_name ?? ""),
    phone: String(c.phone ?? ""),
    email: String(c.email ?? ""),
    address: String(c.address ?? ""),
    clientNumber: String(c.clientNumber ?? c.client_number ?? ""),
    country: String(c.country ?? ""),
    matricule: String(c.matricule ?? ""),
    marque: String(c.marque ?? ""),
    isActive: c.isActive !== false && c.is_active !== false,
    createdAt: String(c.createdAt ?? c.created_at ?? new Date().toISOString()),
    lavSiteId: (c.lavSiteId ?? c.lav_site_id ?? null) as string | null,
  };
}

export function customerDisplayName(c: CustomerRowDto): string {
  return `${c.firstName} ${c.lastName}`.trim() || c.clientNumber || c.id;
}