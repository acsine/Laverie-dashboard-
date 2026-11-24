"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { isSuperAdmin } from "@/lib/session-policy";
import { getSession } from "@/server/auth/session";
import { getEdgeCredentials } from "@/server/auth/edge-credentials";
import { invokeSyncApi } from "@/server/cloud/sync-api";
import { validUntilFromDateInput } from "@/lib/fidelity-card-status";
import {
  buildLinearBarcodeValue,
  formatSerial,
} from "./card-utils";
import { buildQrPayloadHash } from "./qr-payload";
import { customerDisplayName, mapCustomerRow } from "@/server/clients/map-customer";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";
import { listCards, listProgrammes, nextSerialValue } from "./get-fidelity";

const issueSchema = z.object({
  programmeId: z.string().min(1, "Programme requis"),
  customerId: z.string().min(1, "Client requis"),
  validUntil: z.string().min(1, "Date de validité requise"),
});

async function resolveCustomer(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  customerId: string,
): Promise<{ id: string; name: string } | null> {
  const { entities } = await loadWorkspaceEntities(session);
  const raw = ((entities.customers ?? []) as Record<string, unknown>[]).find(
    (c) => String(c.id) === customerId,
  );
  if (!raw) return null;
  const row = mapCustomerRow(raw);
  return { id: row.id, name: customerDisplayName(row).trim().toUpperCase() };
}

type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export async function getFidelityPageDataAction() {
  const [programmes, cards] = await Promise.all([listProgrammes(), listCards()]);
  return { programmes, cards };
}

function parseSerial(numeroSerie: string): number {
  const n = Number.parseInt(String(numeroSerie).replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

async function allocateUniqueSerial(creds: { email: string; password: string }): Promise<number> {
  let serial = await nextSerialValue(creds);
  const cards = await listCards();
  const used = new Set(cards.map((c) => parseSerial(c.numeroSerie)));
  while (used.has(serial)) serial += 1;
  return serial;
}

function mapIssuedCard(
  card: Record<string, unknown>,
  detenteurNom: string,
  customerId: string,
) {
  const id = String(card.id);
  const issuedAt = String(card.issuedAt ?? card.issued_at ?? new Date().toISOString());
  const validUntil = (card.validUntil ?? card.valid_until ?? null) as string | null;
  const numeroSerie = String(card.numeroSerie ?? card.numero_serie ?? "");
  const qrFromApi = String(card.qrPayload ?? card.qr_payload ?? "").trim();
  const qrPayload = qrFromApi || buildQrPayloadHash(id, issuedAt, validUntil);
  return {
    id,
    programmeId: String(card.programmeId ?? card.programme_id),
    customerId,
    detenteurNom: String(card.detenteurNom ?? card.detenteur_nom ?? detenteurNom),
    numeroSerie,
    codeBarre: String(card.codeBarre ?? card.code_barre ?? ""),
    qrPayload,
    issuedAt,
    validUntil,
    statut: String(card.statut ?? "active"),
    createdAt: String(card.createdAt ?? card.created_at ?? new Date().toISOString()),
  };
}

export type IssuedFidelityCardDto = {
  id: string;
  numeroSerie: string;
  detenteurNom: string;
  codeBarre: string;
  qrPayload: string;
  validUntil: string;
  programmeId: string;
  customerId: string;
  issuedAt: string;
  statut: string;
};

export async function issueFidelityCardAction(
  raw: unknown,
): Promise<Result<IssuedFidelityCardDto>> {
  try {
    return await issueFidelityCardActionImpl(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Émission impossible";
    return { ok: false, error: appError("ISSUE_FAILED", message) };
  }
}

async function issueFidelityCardActionImpl(
  raw: unknown,
): Promise<Result<IssuedFidelityCardDto>> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }

  const parsed = issueSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Données invalides"),
    };
  }

  const creds = await getEdgeCredentials();
  if (!creds) {
    return {
      ok: false,
      error: appError(
        "NO_CREDS",
        "Identifiants cloud absents. Déconnectez-vous puis reconnectez-vous.",
      ),
    };
  }

  const customer = await resolveCustomer(session, parsed.data.customerId);
  if (!customer) {
    return { ok: false, error: appError("VALIDATION", "Client introuvable.") };
  }
  const detenteurNom = customer.name;
  let validUntilIso: string;
  try {
    validUntilIso = validUntilFromDateInput(parsed.data.validUntil);
  } catch {
    return { ok: false, error: appError("VALIDATION", "Date de validité invalide.") };
  }

  /** Super admin : Edge `fidelity-issue-card` (séquence atomique) puis QR nom|série. */
  if (isSuperAdmin(session)) {
    const platformIssue = await invokeSyncApi({
      action: "fidelity-issue-card",
      platform_email: creds.email,
      platform_password: creds.password,
      programme_id: parsed.data.programmeId,
      customer_id: customer.id,
      detenteur_nom: detenteurNom,
      valid_until: validUntilIso,
      validUntil: validUntilIso,
    });

    if (platformIssue.status !== 200 || platformIssue.data.ok !== true) {
      const hint =
        platformIssue.status === 401
          ? " Compte plateforme requis : exécutez scripts/seed-superadmin.sql puis connectez superadmin@laverie.com."
          : "";
      return {
        ok: false,
        error: appError(
          "ISSUE_FAILED",
          `${String(platformIssue.data.error ?? "Non autorisé (plateforme)")}.${hint}`,
        ),
      };
    }

    const rawCard = (platformIssue.data.card ?? {}) as Record<string, unknown>;
    const mapped = mapIssuedCard(rawCard, detenteurNom, customer.id);

    const upsert = await invokeSyncApi({
      action: "fidelity-upsert",
      platform_email: creds.email,
      platform_password: creds.password,
      card: mapped,
    });

    if (upsert.status !== 200 || upsert.data.ok !== true) {
      return {
        ok: false,
        error: appError(
          "ISSUE_FAILED",
          String(upsert.data.error ?? "Synchronisation QR impossible après émission"),
        ),
      };
    }

    revalidatePath("/fidelite");
    return {
      ok: true,
      data: {
        id: mapped.id,
        numeroSerie: mapped.numeroSerie,
        detenteurNom: mapped.detenteurNom,
        codeBarre: mapped.codeBarre,
        qrPayload: mapped.qrPayload,
        validUntil: String(mapped.validUntil ?? validUntilIso),
        programmeId: mapped.programmeId,
        customerId: mapped.customerId,
        issuedAt: mapped.issuedAt,
        statut: mapped.statut,
      },
    };
  }

  /** Admin de site : sync-push-direct (Edge n’accepte pas les comptes plateforme ici). */
  if (!isSuperAdmin(session) && session.role !== "admin") {
    return {
      ok: false,
      error: appError(
        "FORBIDDEN",
        "Émission réservée au super admin plateforme ou à l’administrateur du site.",
      ),
    };
  }

  const serial = await allocateUniqueSerial(creds);
  const id = `lav_fcard_${Date.now()}_${randomBytes(3).toString("hex")}`;
  const issuedAt = new Date();
  const issuedIso = issuedAt.toISOString();
  const numeroSerie = formatSerial(serial);
  const codeBarre = buildLinearBarcodeValue(serial);
  const qrPayload = buildQrPayloadHash(id, issuedIso, validUntilIso);

  const push = await invokeSyncApi({
    action: "sync-push-direct",
    email: creds.email,
    password: creds.password,
    changes: [
      {
        entity_type: "lav_fidelite_carte",
        entity_id: id,
        action: "UPSERT",
        payload: {
          id,
          programmeId: parsed.data.programmeId,
          customerId: customer.id,
          detenteurNom,
          numeroSerie,
          codeBarre,
          qrPayload,
          issuedAt: issuedIso,
          validUntil: validUntilIso,
          statut: "active",
          createdAt: issuedIso,
        },
      },
    ],
  });

  if (push.status !== 200 || push.data.ok !== true) {
    const msg =
      push.status === 401
        ? "Non autorisé : connectez-vous avec admin@laverie.com (rôle admin)."
        : String(push.data.error ?? "Émission impossible");
    return { ok: false, error: appError("ISSUE_FAILED", msg) };
  }

  revalidatePath("/fidelite");
  return {
    ok: true,
    data: {
      id,
      numeroSerie,
      detenteurNom,
      codeBarre,
      qrPayload,
      validUntil: validUntilIso,
      programmeId: parsed.data.programmeId,
      customerId: customer.id,
      issuedAt: issuedIso,
      statut: "active",
    },
  };
}

export async function deleteFidelityCardAction(
  cardId: string,
): Promise<Result<{ id: string }>> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }
  const creds = await getEdgeCredentials();
  if (!creds) {
    return {
      ok: false,
      error: appError("NO_CREDS", "Reconnectez-vous pour continuer."),
    };
  }

  if (isSuperAdmin(session)) {
    const platform = await invokeSyncApi({
      action: "fidelity-delete",
      platform_email: creds.email,
      platform_password: creds.password,
      entity_id: cardId,
      entityId: cardId,
    });

    if (platform.status === 200 && platform.data.ok === true) {
      revalidatePath("/fidelite");
      return { ok: true, data: { id: cardId } };
    }
  }

  if (!isSuperAdmin(session) && session.role !== "admin") {
    return { ok: false, error: appError("FORBIDDEN", "Révocation non autorisée.") };
  }

  const cards = await listCards();
  const existing = cards.find((c) => c.id === cardId);
  if (!existing) {
    return { ok: false, error: appError("NOT_FOUND", "Carte introuvable.") };
  }

  const push = await invokeSyncApi({
    action: "sync-push-direct",
    email: creds.email,
    password: creds.password,
    changes: [
      {
        entity_type: "lav_fidelite_carte",
        entity_id: cardId,
        action: "UPSERT",
        payload: {
          id: existing.id,
          programmeId: existing.programmeId,
          detenteurNom: existing.detenteurNom,
          numeroSerie: existing.numeroSerie,
          codeBarre: existing.codeBarre,
          qrPayload:
            existing.qrPayload ||
            buildQrPayloadHash(existing.id, existing.issuedAt, existing.validUntil),
          issuedAt: existing.issuedAt,
          validUntil: existing.validUntil,
          statut: "revoked",
          createdAt: existing.issuedAt,
        },
      },
    ],
  });

  if (push.status !== 200 || push.data.ok !== true) {
    return {
      ok: false,
      error: appError("DELETE_FAILED", String(push.data.error ?? "Suppression impossible")),
    };
  }

  revalidatePath("/fidelite");
  return { ok: true, data: { id: cardId } };
}