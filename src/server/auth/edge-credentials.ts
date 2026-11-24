import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/config/env";

const COOKIE = "lav_edge_cred";

function secret() {
  const { SESSION_SECRET } = getServerEnv();
  if (!SESSION_SECRET) throw new Error("SESSION_SECRET manquant");
  return new TextEncoder().encode(SESSION_SECRET);
}

/** Stocke email/mdp cloud en cookie HttpOnly signé (appels Edge sync-api). */
export async function setEdgeCredentials(email: string, password: string) {
  const token = await new SignJWT({ email, password })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearEdgeCredentials() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getEdgeCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.email !== "string" || typeof payload.password !== "string") {
      return null;
    }
    return { email: payload.email, password: payload.password };
  } catch {
    return null;
  }
}
