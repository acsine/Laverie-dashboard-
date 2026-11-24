/** Payload cloud complet à partir d’une ligne employé (évite un upsert partiel). */
export function employeeCloudPayloadFromRaw(
  raw: Record<string, unknown>,
  patch: Record<string, unknown> = {},
): Record<string, unknown> {
  const now = new Date().toISOString();
  const contractType = String(raw.contractType ?? raw.contract_type ?? "perVehicle");
  const monthlyRaw = raw.monthlySalary ?? raw.monthly_salary;
  return {
    id: String(raw.id),
    lavSiteId: String(raw.lavSiteId ?? raw.lav_site_id ?? ""),
    firstName: String(raw.firstName ?? raw.first_name ?? ""),
    lastName: String(raw.lastName ?? raw.last_name ?? ""),
    email: raw.email ? String(raw.email).toLowerCase() : null,
    phone: String(raw.phone ?? ""),
    role: String(raw.role ?? ""),
    contractType,
    monthlySalary:
      contractType === "monthly" && monthlyRaw != null ? Number(monthlyRaw) : null,
    ratePerVehicleType:
      contractType === "perVehicle"
        ? (raw.ratePerVehicleType ?? raw.rate_per_vehicle_type ?? {})
        : null,
    isActive: raw.isActive !== false && raw.is_active !== false,
    hireDate: String(raw.hireDate ?? raw.hire_date ?? now),
    createdAt: String(raw.createdAt ?? raw.created_at ?? now),
    updatedAt: now,
    ...patch,
  };
}