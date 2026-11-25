"use server";

import { appError, type AppError } from "@/lib/errors";
import { userFacingMessage } from "@/lib/user-facing-errors";
import { hashPasswordEdge } from "@/server/cloud/entity-sync";
import { invokeSyncApi } from "@/server/cloud/sync-api";
import { setEdgeCredentials } from "./edge-credentials";
import {
  getSession,
  setSessionCookies,
  signAccessToken,
  type SessionPayload,
} from "./session";

type Result = { ok: true } | { ok: false; error: AppError };

export async function changePasswordCloud(
  session: SessionPayload,
  currentPassword: string,
  newPassword: string,
): Promise<Result> {
  const email = session.email.trim().toLowerCase();

  const edge = await invokeSyncApi({
    action: "account-change-password",
    email,
    current_password: currentPassword,
    new_password: newPassword,
  });

  if (edge.status === 200 && edge.data.ok === true) {
    await finalizePasswordChange(session, newPassword);
    return { ok: true };
  }

  const edgeMsg = String(edge.data.error ?? "");
  const unknownAction =
    edge.status === 400 && edgeMsg.toLowerCase().includes("action inconnue");

  if (unknownAction && session.kind === "employee") {
    return changeEmployeePasswordViaPush(session, currentPassword, newPassword);
  }

  if (edge.status === 401) {
    return { ok: false, error: appError("INVALID_PASSWORD", "Mot de passe actuel incorrect.") };
  }

  if (unknownAction && session.kind === "platform") {
    return {
      ok: false,
      error: appError(
        "NOT_SUPPORTED",
        userFacingMessage(
          "Déployez la fonction Edge sync-api (action account-change-password) sur Supabase.",
          "Changement de mot de passe indisponible pour ce compte.",
        ),
      ),
    };
  }

  return { ok: false, error: appError("CHANGE_FAILED", edgeMsg || "Changement impossible") };
}

async function changeEmployeePasswordViaPush(
  session: SessionPayload,
  currentPassword: string,
  newPassword: string,
): Promise<Result> {
  const email = session.email.trim().toLowerCase();
  const pull = await invokeSyncApi({
    action: "sync-pull",
    email,
    password: currentPassword,
  });
  if (pull.status !== 200 || pull.data.error) {
    return { ok: false, error: appError("INVALID_PASSWORD", "Mot de passe actuel incorrect.") };
  }

  const entities = pull.data.entities as Record<string, unknown> | undefined;
  const employees = (entities?.employees as Record<string, unknown>[]) ?? [];
  const me =
    employees.find((e) => String(e.id) === session.sub) ??
    employees.find((e) => String(e.email ?? "").toLowerCase() === email);
  if (!me) {
    return { ok: false, error: appError("NO_USER", "Profil employé introuvable.") };
  }

  const payload = {
    ...me,
    id: String(me.id),
    passwordHash: hashPasswordEdge(newPassword),
    updatedAt: new Date().toISOString(),
  };

  const push = await invokeSyncApi({
    action: "sync-push-direct",
    email,
    password: currentPassword,
    changes: [
      {
        entity_type: "employees",
        entity_id: payload.id,
        action: "UPSERT",
        payload,
      },
    ],
  });

  if (push.status !== 200 || push.data.ok !== true) {
    return {
      ok: false,
      error: appError("CHANGE_FAILED", String(push.data.error ?? "Mise à jour refusée")),
    };
  }

  await finalizePasswordChange(session, newPassword);
  return { ok: true };
}

async function finalizePasswordChange(session: SessionPayload, newPassword: string) {
  await setEdgeCredentials(session.email, newPassword);
  const accessToken = await signAccessToken({
    ...session,
    mustChangePassword: false,
  });
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const refresh = jar.get("lav_refresh")?.value;
  if (refresh) {
    await setSessionCookies(accessToken, refresh);
  }
}