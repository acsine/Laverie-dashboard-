import type { Metadata } from "next";
import { FidelityPage } from "@/features/fidelity/components/fidelity-page";
import { filterNotSoftDeleted } from "@/lib/soft-delete";
import { customerDisplayName, mapCustomerRow } from "@/server/clients/map-customer";
import { getEdgeCredentials } from "@/server/auth/edge-credentials";
import { requireSession } from "@/server/auth/guards";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";
import { listCards, listProgrammes, nextSerialValue } from "@/server/fidelity/get-fidelity";

export const metadata: Metadata = { title: "Fidélité" };
export const dynamic = "force-dynamic";

export default async function FideliteRoute() {
  try {
    const session = await requireSession();
    const creds = await getEdgeCredentials();
    const [programmes, cards, nextSerial, { entities }] = await Promise.all([
      listProgrammes(),
      listCards(),
      nextSerialValue(creds ?? undefined),
      loadWorkspaceEntities(session),
    ]);
    const customers = filterNotSoftDeleted(
      (entities.customers ?? []) as Record<string, unknown>[],
    ).map((c) => {
      const row = mapCustomerRow(c);
      return { id: row.id, label: customerDisplayName(row) };
    });
    return (
      <FidelityPage
        programmes={programmes}
        cards={cards}
        nextSerial={nextSerial}
        customerOptions={customers}
      />
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return (
      <div className="rounded-panel border border-danger/30 bg-danger/10 p-6 text-sm text-danger">
        Impossible de charger la fidélité : {message}
      </div>
    );
  }
}
