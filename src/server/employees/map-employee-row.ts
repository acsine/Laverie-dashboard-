import {
  parseVehicleCommissionRules,
  type VehicleCommissionRule,
} from "@/lib/employee-commission";

export type EmployeeRowDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  contractType: string;
  isActive: boolean;
  hireDate: string;
  monthlySalary: number | null;
  ratePerVehicleType: Record<string, VehicleCommissionRule> | null;
  createdAt: string;
  lavSiteId: string | null;
};

function parseRates(raw: unknown): Record<string, VehicleCommissionRule> | null {
  const rules = parseVehicleCommissionRules(raw);
  return Object.keys(rules).length ? rules : null;
}

export function mapEmployeeRow(e: Record<string, unknown>): EmployeeRowDto {
  return {
    id: String(e.id),
    firstName: String(e.firstName ?? e.first_name ?? ""),
    lastName: String(e.lastName ?? e.last_name ?? ""),
    email: String(e.email ?? ""),
    phone: String(e.phone ?? ""),
    role: String(e.role ?? ""),
    contractType: String(e.contractType ?? e.contract_type ?? "perVehicle"),
    isActive: e.isActive !== false && e.is_active !== false,
    hireDate: String(e.hireDate ?? e.hire_date ?? new Date().toISOString()),
    monthlySalary:
      e.monthlySalary != null
        ? Number(e.monthlySalary)
        : e.monthly_salary != null
          ? Number(e.monthly_salary)
          : null,
    ratePerVehicleType: parseRates(e.ratePerVehicleType ?? e.rate_per_vehicle_type),
    createdAt: String(e.createdAt ?? e.created_at ?? new Date().toISOString()),
    lavSiteId: (e.lavSiteId ?? e.lav_site_id ?? null) as string | null,
  };
}