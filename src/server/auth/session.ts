import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { getServerEnv } from "@/config/env";
import { hasDatabaseUrl } from "@/lib/supabase";

export const ACCESS_COOKIE = "lav_access";
export const REFRESH_COOKIE = "lav_refresh";

export type SessionPayload = {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  sid: string;
  mustChangePassword: boolean;
  totpPending?: boolean;
  kind?: "platform" | "employee";
  role?: string;
  lavSiteId?: string | null;
  isPlatformSuperAdmin?: boolean;
  canApproveTrial?: boolean;
};

function getSecret() {
  const { SESSION_SECRET } = getServerEnv();
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET manquant (min. 32 caractères)");
  }
  return new TextEncoder().encode(SESSION_SECRET);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export async function signAccessToken(payload: SessionPayload): Promise<string> {
  const { SESSION_ACCESS_TTL } = getServerEnv();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_ACCESS_TTL}s`)
    .sign(getSecret());
}

export async function signRefreshJwt(payload: SessionPayload): Promise<string> {
  const { SESSION_REFRESH_TTL } = getServerEnv();
  return new SignJWT({ ...payload, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_REFRESH_TTL}s`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email as string,
      firstName: (payload.firstName as string) || "",
      lastName: (payload.lastName as string) || "",
      sid: (payload.sid as string) || "",
      mustChangePassword: Boolean(payload.mustChangePassword),
      totpPending: Boolean(payload.totpPending),
      kind: payload.kind as SessionPayload["kind"],
      role: payload.role as string | undefined,
      lavSiteId: (payload.lavSiteId as string) || null,
      isPlatformSuperAdmin: payload.isPlatformSuperAdmin === true,
      canApproveTrial: payload.canApproveTrial === true,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookies(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  const { SESSION_ACCESS_TTL, SESSION_REFRESH_TTL } = getServerEnv();
  const secure = process.env.NODE_ENV === "production";

  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_ACCESS_TTL,
  });

  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_REFRESH_TTL,
  });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) {
      if (payload.totpPending) return null;
      return payload;
    }
  }

  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  return refreshSession(refresh);
}

export async function getPendingAuthSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  return verifyAccessToken(access);
}

async function refreshSession(refreshToken: string): Promise<SessionPayload | null> {
  // Mode cloud (sans Prisma) : refresh = JWT signé
  if (!hasDatabaseUrl()) {
    try {
      const { payload } = await jwtVerify(refreshToken, getSecret());
      if (!payload.sub || payload.typ !== "refresh") return null;
      const session: SessionPayload = {
        sub: payload.sub,
        email: payload.email as string,
        firstName: (payload.firstName as string) || "",
        lastName: (payload.lastName as string) || "",
        sid: (payload.sid as string) || "",
        mustChangePassword: Boolean(payload.mustChangePassword),
        kind: payload.kind as SessionPayload["kind"],
        role: payload.role as string | undefined,
        lavSiteId: (payload.lavSiteId as string) || null,
        isPlatformSuperAdmin: payload.isPlatformSuperAdmin === true,
        canApproveTrial: payload.canApproveTrial === true,
      };
      const accessToken = await signAccessToken(session);
      const newRefresh = await signRefreshJwt(session);
      await setSessionCookies(accessToken, newRefresh);
      return session;
    } catch {
      return null;
    }
  }

  const { db } = await import("@/lib/db");
  const hash = hashToken(refreshToken);
  const session = await db.lavSession.findFirst({
    where: {
      refreshTokenHash: hash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session || !session.user.isActive) return null;

  const payload: SessionPayload = {
    sub: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    sid: session.id,
    mustChangePassword: session.user.mustChangePassword,
    kind: "platform",
    isPlatformSuperAdmin: session.user.isSuperAdmin,
    canApproveTrial: session.user.canApproveTrial,
  };

  const accessToken = await signAccessToken(payload);
  const newRefresh = newRefreshToken();
  const { SESSION_REFRESH_TTL } = getServerEnv();

  await db.lavSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(newRefresh),
      expiresAt: new Date(Date.now() + SESSION_REFRESH_TTL * 1000),
    },
  });

  await setSessionCookies(accessToken, newRefresh);
  return payload;
}

function assertSessionSite(params: {
  kind?: "platform" | "employee";
  lavSiteId?: string | null;
}) {
  if (params.kind === "employee" && !params.lavSiteId?.trim()) {
    throw new Error("SITE_REQUIRED");
  }
}

export async function createSession(params: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  totpPending?: boolean;
  kind?: "platform" | "employee";
  role?: string;
  lavSiteId?: string | null;
  isPlatformSuperAdmin?: boolean;
  canApproveTrial?: boolean;
  ip?: string | null;
  userAgent?: string | null;
}) {
  assertSessionSite(params);
  const sid = `lav_sess_${randomBytes(8).toString("hex")}`;
  const payload: SessionPayload = {
    sub: params.userId,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    sid,
    mustChangePassword: params.mustChangePassword,
    totpPending: params.totpPending,
    kind: params.kind ?? "platform",
    role: params.role,
    lavSiteId: params.lavSiteId,
    isPlatformSuperAdmin: params.isPlatformSuperAdmin === true,
    canApproveTrial: params.canApproveTrial === true,
  };

  const accessToken = await signAccessToken(payload);

  if (!hasDatabaseUrl()) {
    const refreshToken = await signRefreshJwt(payload);
    await setSessionCookies(accessToken, refreshToken);
    return payload;
  }

  const { db } = await import("@/lib/db");
  const { SESSION_REFRESH_TTL } = getServerEnv();
  const refreshToken = newRefreshToken();

  await db.lavSession.create({
    data: {
      id: sid,
      userId: params.userId,
      refreshTokenHash: hashToken(refreshToken),
      ip: params.ip ?? undefined,
      userAgent: params.userAgent ?? undefined,
      expiresAt: new Date(Date.now() + SESSION_REFRESH_TTL * 1000),
    },
  });

  await setSessionCookies(accessToken, refreshToken);
  return payload;
}

export async function revokeSession(sessionId: string) {
  if (!hasDatabaseUrl()) return;
  const { db } = await import("@/lib/db");
  await db.lavSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
