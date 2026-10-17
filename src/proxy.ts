import { NextResponse, type NextRequest } from "next/server";
import { accessKeys, readAccessConfig, verifyAccessToken } from "@/lib/access";
import { isPublicPath, sameSiteWrite } from "@/lib/auth/paths";
import {
  authStore,
  cookieNames,
  isSecureRequest,
  readSession,
} from "@/lib/auth/session";
import { lifetimes } from "@/lib/auth/store";
import { isDemoMode } from "@/lib/demo/mode";

const access = readAccessConfig(process.env);
const keys = access ? accessKeys(access) : null;
const readOnly = new Set(["GET", "HEAD", "OPTIONS"]);

function refused(api: boolean, status: number, message: string) {
  return api
    ? NextResponse.json(
        { error: message },
        { status, headers: { "Cache-Control": "no-store" } },
      )
    : new NextResponse(message, {
        status,
        headers: { "Cache-Control": "no-store" },
      });
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const api = path.startsWith("/api/");
  if (access && keys) {
    const result = await verifyAccessToken(
      request.headers.get("cf-access-jwt-assertion"),
      keys,
      access,
    );
    if (!result.ok)
      return refused(api, 403, "Sign in through Cloudflare Access.");
  }
  if (isDemoMode()) return NextResponse.next();

  if (authStore().userCount() === 0) {
    if (path === "/setup" || isPublicPath(path)) return NextResponse.next();
    if (api) return refused(true, 503, "Create the admin account first.");
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  if (path === "/setup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublicPath(path)) return NextResponse.next();

  const now = Date.now();
  const signedIn = readSession(
    request.headers,
    (name) => request.cookies.get(name)?.value,
    now,
  );
  if (!signedIn) {
    if (api) return refused(true, 401, "Sign in to My Tesla.");
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const web = signedIn.session.kind === "web";
  if (
    web &&
    api &&
    !readOnly.has(request.method) &&
    !sameSiteWrite(request.headers, request.headers.get("host") ?? "")
  ) {
    return refused(true, 403, "This request came from another site.");
  }

  const response = NextResponse.next();
  if (web && signedIn.session.lastUsedAt === now) {
    const secure = isSecureRequest(request.headers);
    const name = secure ? cookieNames.secure : cookieNames.plain;
    const value = request.cookies.get(name)?.value;
    if (value) {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: lifetimes.web / 1000,
      });
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image).*)"],
};
