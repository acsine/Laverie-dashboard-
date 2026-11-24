import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "lav_access";
const REFRESH_COOKIE = "lav_refresh";

type Payload = {
  sub?: string;
  mustChangePassword?: boolean;
  totpPending?: boolean;
};

function isServerAction(req: NextRequest): boolean {
  return req.headers.has("next-action") || req.headers.has("Next-Action");
}

function jwtSecret(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function readAccessSession(req: NextRequest): Promise<Payload | null> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const key = jwtSecret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub) return null;
    return {
      sub: String(payload.sub),
      mustChangePassword: Boolean(payload.mustChangePassword),
      totpPending: Boolean(payload.totpPending),
    };
  } catch {
    return null;
  }
}

/** Refresh valide : autoriser la requête pour que getSession() rafraîchisse l'access côté RSC. */
async function hasValidRefresh(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!token) return false;
  const key = jwtSecret();
  if (!key) return false;
  try {
    const { payload } = await jwtVerify(token, key);
    return Boolean(payload.sub && payload.typ === "refresh");
  } catch {
    return false;
  }
}

function redirectUnlessAction(req: NextRequest, url: URL): NextResponse {
  if (isServerAction(req)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessSession = await readAccessSession(req);
  const refreshValid = await hasValidRefresh(req);
  const canEnterApp = Boolean(accessSession) || refreshValid;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/change-password");

  const isPlatform = pathname.startsWith("/platform") || pathname === "/";

  if (accessSession?.totpPending && !pathname.startsWith("/login/2fa") && pathname !== "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/login/2fa";
    return redirectUnlessAction(req, url);
  }

  if (pathname.startsWith("/change-password") && !canEnterApp) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return redirectUnlessAction(req, url);
  }

  if (
    accessSession &&
    !accessSession.totpPending &&
    accessSession.mustChangePassword
  ) {
    if (!pathname.startsWith("/change-password") && !pathname.startsWith("/login")) {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return redirectUnlessAction(req, url);
    }
  }

  const isProtected =
    pathname === "/" ||
    (!isAuthRoute &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/forgot-password"));

  if (isProtected || isPlatform) {
    if (!canEnterApp || accessSession?.totpPending) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return redirectUnlessAction(req, url);
    }
  }

  // Ne pas renvoyer vers / si seul le refresh est valide (évite boucle avec layout → /login).
  if (
    pathname === "/login" &&
    accessSession &&
    !accessSession.totpPending &&
    !accessSession.mustChangePassword
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return redirectUnlessAction(req, url);
  }

  if (isAuthRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};