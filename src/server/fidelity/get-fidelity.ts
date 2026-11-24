import { fidelityCardEffectiveStatut } from "@/lib/fidelity-card-status";
import { getSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { invokeSyncApi } from "@/server/cloud/sync-api";

function parseSerialNumber(numeroSerie: string): number {
  const n = Number.parseInt(String(numeroSerie).replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

function maxSerialFromCards(items: Array<{ numeroSerie?: string; numero_serie?: string }>): number {
  let max = 0;
  for (const c of items) {
    const label = c.numeroSerie ?? c.numero_serie ?? "";
    max = Math.max(max, parseSerialNumber(label));
  }
  return max;
}

export type FidelityProgramme = {
  id: string;
  tier: string;
  libelle: string;
  lavagesParMois: number;
  isActive: boolean;
};

export type FidelityCardRow = {
  id: string;
  programmeId: string;
  programmeLabel: string;
  customerId: string | null;
  detenteurNom: string;
  numeroSerie: string;
  codeBarre: string;
  qrPayload: string;
  statut: string;
  issuedAt: string;
  issuedLabel: string;
  validUntil: string | null;
  validUntilLabel: string;
  effectiveStatut: string;
};

export async function listProgrammes(): Promise<FidelityProgramme[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lav_fidelite_programme")
    .select("id, tier, libelle, lavages_par_mois, is_active")
    .order("tier");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    tier: p.tier as string,
    libelle: p.libelle as string,
    lavagesParMois: Number(p.lavages_par_mois ?? 0),
    isActive: p.is_active === true,
  }));
}

export async function listCards(): Promise<FidelityCardRow[]> {
  const supabase = getSupabase();
  const [{ data: cards, error }, programmes] = await Promise.all([
    supabase
      .from("lav_fidelite_carte")
      .select(
        "id, programme_id, customer_id, detenteur_nom, numero_serie, code_barre, qr_payload, statut, issued_at, valid_until",
      )
      .order("issued_at", { ascending: false })
      .limit(500),
    listProgrammes(),
  ]);
  if (error) throw new Error(error.message);

  const progMap = new Map(programmes.map((p) => [p.id, p.libelle]));

  return (cards ?? []).map((c) => {
    const statut = String(c.statut ?? "");
    const validUntil = c.valid_until ? String(c.valid_until) : null;
  return {
    id: c.id as string,
    programmeId: c.programme_id as string,
    programmeLabel: progMap.get(c.programme_id as string) ?? c.programme_id,
    customerId: (c.customer_id as string | null) ?? null,
    detenteurNom: c.detenteur_nom as string,
    numeroSerie: c.numero_serie as string,
    codeBarre: c.code_barre as string,
    qrPayload: (c.qr_payload as string) || "",
    statut,
    issuedAt: String(c.issued_at ?? ""),
    issuedLabel: formatDate(c.issued_at as string),
    validUntil,
    validUntilLabel: validUntil ? formatDate(validUntil) : "—",
    effectiveStatut: fidelityCardEffectiveStatut(statut, validUntil),
  };
  });
}

/** Prochain numéro unique (cloud + séquence). Passer les creds edge pour inclure toutes les cartes du pull. */
export async function nextSerialValue(creds?: {
  email: string;
  password: string;
}): Promise<number> {
  let max = maxSerialFromCards(await listCards());

  const supabase = getSupabase();
  const { data: seq } = await supabase
    .from("lav_fidelite_sequence")
    .select("last_value")
    .eq("id", "default")
    .maybeSingle();
  if (seq?.last_value != null) {
    max = Math.max(max, Number(seq.last_value));
  }

  if (creds) {
    const pull = await invokeSyncApi({
      action: "sync-pull",
      email: creds.email,
      password: creds.password,
    });
    if (pull.status === 200) {
      const entities = pull.data.entities as Record<string, unknown> | undefined;
      const fromEntities = (entities?.lav_fidelite_carte as Array<{
        numeroSerie?: string;
        numero_serie?: string;
      }>) ?? [];
      max = Math.max(max, maxSerialFromCards(fromEntities));
    }
  }

  return max + 1;
}
