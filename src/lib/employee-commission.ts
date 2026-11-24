export type CommissionMode = "fixed" | "percent";

export type VehicleCommissionRule = {
  mode: CommissionMode;
  value: number;
};

export type CommissionFormRow = {
  vehicleTypeId: string;
  mode: CommissionMode;
  amount: string;
};

const MODE_KEY = "__commissionModes";

export function parseVehicleCommissionRules(
  raw: unknown,
): Record<string, VehicleCommissionRule> {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, unknown>;
  const modes =
    map[MODE_KEY] && typeof map[MODE_KEY] === "object"
      ? (map[MODE_KEY] as Record<string, CommissionMode>)
      : {};
  const out: Record<string, VehicleCommissionRule> = {};
  for (const [key, val] of Object.entries(map)) {
    if (key === MODE_KEY) continue;
    if (val != null && typeof val === "object" && "value" in (val as object)) {
      const o = val as { mode?: string; value?: unknown };
      const mode: CommissionMode = o.mode === "percent" ? "percent" : "fixed";
      const value = Number(o.value);
      if (value > 0) out[key] = { mode, value };
      continue;
    }
    const num = Number(val);
    if (!(num > 0)) continue;
    const mode = modes[key] === "percent" ? "percent" : "fixed";
    out[key] = { mode, value: num };
  }
  return out;
}

export function serializeVehicleCommissionRules(
  rules: Record<string, VehicleCommissionRule>,
): Record<string, unknown> {
  const modes: Record<string, CommissionMode> = {};
  const values: Record<string, number> = {};
  for (const [id, rule] of Object.entries(rules)) {
    modes[id] = rule.mode;
    values[id] = rule.value;
  }
  if (!Object.keys(values).length) return {};
  return { ...values, [MODE_KEY]: modes };
}

export function commissionRulesFromFormRows(
  rows: CommissionFormRow[],
): Record<string, VehicleCommissionRule> {
  const out: Record<string, VehicleCommissionRule> = {};
  for (const row of rows) {
    if (!row.vehicleTypeId) continue;
    const value = Number(row.amount);
    if (!(value > 0)) continue;
    out[row.vehicleTypeId] = { mode: row.mode, value };
  }
  return out;
}

export function commissionRowsFromRules(
  rules: Record<string, VehicleCommissionRule>,
): CommissionFormRow[] {
  return Object.entries(rules).map(([vehicleTypeId, rule]) => ({
    vehicleTypeId,
    mode: rule.mode,
    amount: String(rule.value),
  }));
}

export function formatCommissionRule(rule: VehicleCommissionRule): string {
  if (rule.mode === "percent") return `${rule.value} %`;
  return `${rule.value.toLocaleString("fr-FR")} FCFA`;
}

export function parseDefaultCommissionPercent(appConfig: Record<string, unknown>): number | null {
  const v =
    appConfig.per_vehicle_default_commission_percent ??
    appConfig.perVehicleDefaultCommissionPercent;
  if (v == null || v === "") return null;
  const n = Number(v);
  return n > 0 ? n : null;
}