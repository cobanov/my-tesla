"use server";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { refresh } from "next/cache";
import { encode } from "uqr";
import { pairingLink, qrPath, requestOrigin } from "../app/pairing";
import { findCar } from "../queries";
import { siteUrl } from "../site";
import { waitText } from "./limits";
import {
  hashPassword,
  PasswordBusyError,
  passwordProblem,
  verifyNobody,
  verifyPassword,
} from "./password";
import { safeNext } from "./paths";
import {
  authStore,
  clearSessionCookie,
  clientAddress,
  currentSession,
  isSetupToken,
  limits,
  setSessionCookie,
} from "./session";

export type FormResult = {
  error: string | null;
  done?: string;
  values?: Record<string, string>;
};

const emailPattern = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

async function address(): Promise<string | null> {
  return clientAddress(await headers());
}

type Attempt = { account: string; address: string | null };

function attemptKey({ account, address: from }: Attempt): string {
  return `${account}|${from ?? "?"}`;
}

function blocked(attempt: Attempt): string | null {
  const now = Date.now();
  if (attempt.address && limits.address().blocked(attempt.address, now)) {
    return "Too many failed tries from this network today. Try again tomorrow.";
  }
  const wait = Math.max(
    limits.attempt().waitMs(attemptKey(attempt), now),
    limits.account().waitMs(attempt.account, now),
  );
  return wait > 0 ? `Wait ${waitText(wait)} before you try again.` : null;
}

function failed(attempt: Attempt): void {
  const now = Date.now();
  if (attempt.address) limits.address().fail(attempt.address, now);
  limits.attempt().fail(attemptKey(attempt), now);
  limits.account().fail(attempt.account, now);
}

function succeeded(attempt: Attempt): void {
  limits.attempt().succeed(attemptKey(attempt));
  limits.account().succeed(attempt.account);
}

const busy = {
  error: "Too many sign-ins at once. Try again in a moment.",
};

export async function signIn(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const email = text(form, "email").trim().toLowerCase();
  const password = text(form, "password");
  const values = { email };
  const attempt = { account: `login:${email}`, address: await address() };
  const stop = blocked(attempt);
  if (stop) return { error: stop, values };
  const found = authStore().credentialsByEmail(email);
  let valid: boolean;
  try {
    valid = found
      ? await verifyPassword(found.passwordHash, password)
      : await verifyNobody(password);
  } catch (error) {
    if (error instanceof PasswordBusyError) return { ...busy, values };
    throw error;
  }
  if (!found || !valid) {
    failed(attempt);
    return { error: "The email or the password is wrong.", values };
  }
  succeeded(attempt);
  authStore().prune(Date.now());
  const { token } = authStore().createSession(
    {
      userId: found.user.id,
      kind: "web",
      status: "active",
      ip: attempt.address,
    },
    Date.now(),
  );
  await setSessionCookie(token);
  redirect(safeNext(text(form, "next")));
}

export async function setUp(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  if (authStore().userCount() > 0) notFound();
  const from = await address();
  if (from && limits.address().blocked(from, Date.now())) {
    return {
      error:
        "Too many failed tries from this network today. Try again tomorrow.",
    };
  }
  if (!isSetupToken(text(form, "token").trim())) {
    if (from) limits.address().fail(from, Date.now());
    return {
      error:
        "The setup code is wrong. Copy the setup link from the server log again.",
    };
  }
  const name = text(form, "name").trim();
  const email = text(form, "email").trim().toLowerCase();
  const password = text(form, "password");
  const values = { name, email };
  if (!name || name.length > 80) return { error: "Type your name.", values };
  if (!emailPattern.test(email)) {
    return { error: "Type a valid email.", values };
  }
  const weak = passwordProblem(password);
  if (weak) return { error: weak, values };
  if (password !== text(form, "confirm")) {
    return { error: "The two passwords differ.", values };
  }
  const user = authStore().createFirstAdmin(
    { email, name, passwordHash: await hashPassword(password) },
    Date.now(),
  );
  if (!user) return { error: "An admin account exists already. Sign in." };
  console.info(`My Tesla: the admin account for ${email} is ready.`);
  const { token } = authStore().createSession(
    { userId: user.id, kind: "web", status: "active", ip: from },
    Date.now(),
  );
  await setSessionCookie(token);
  redirect("/");
}

async function requireWeb() {
  const signedIn = await currentSession();
  if (!signedIn || signedIn.session.kind !== "web") redirect("/login");
  return signedIn;
}

export async function signOut(): Promise<void> {
  const signedIn = await currentSession();
  if (signedIn) authStore().deleteSession(signedIn.session.id);
  await clearSessionCookie();
  redirect("/login");
}

export async function changePassword(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { user, session } = await requireWeb();
  const attempt = { account: `password:${user.id}`, address: await address() };
  const stop = blocked(attempt);
  if (stop) return { error: stop };
  const stored = authStore().passwordHash(user.id);
  let valid: boolean;
  try {
    valid =
      Boolean(stored) &&
      (await verifyPassword(stored ?? "", text(form, "current")));
  } catch (error) {
    if (error instanceof PasswordBusyError) return busy;
    throw error;
  }
  if (!valid) {
    failed(attempt);
    return { error: "The current password is wrong." };
  }
  const next = text(form, "password");
  const weak = passwordProblem(next);
  if (weak) return { error: weak };
  if (next !== text(form, "confirm")) {
    return { error: "The two new passwords differ." };
  }
  succeeded(attempt);
  authStore().setPassword(user.id, await hashPassword(next), Date.now());
  authStore().deleteOtherSessions(user.id, session.id);
  refresh();
  return {
    error: null,
    done: "The password is changed. Every other session and phone is signed out.",
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  const { user, session } = await requireWeb();
  if (typeof sessionId !== "string" || sessionId === session.id) return;
  authStore().deleteUserSession(user.id, sessionId);
  refresh();
}

export async function signOutOthers(): Promise<void> {
  const { user, session } = await requireWeb();
  authStore().deleteOtherSessions(user.id, session.id);
  refresh();
}

export async function createScriptToken(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { user } = await requireWeb();
  const name = text(form, "name")
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
  if (!name || name.length > 60) {
    return { error: "Name the token, for example the script that uses it." };
  }
  const { token } = authStore().createSession(
    {
      userId: user.id,
      kind: "device",
      status: "active",
      device: { name, platform: "script", ip: null },
      ip: null,
    },
    Date.now(),
  );
  refresh();
  return { error: null, done: token, values: { name } };
}

export type PairingCode =
  | {
      ok: true;
      path: string;
      size: number;
      url: string;
      expiresAt: number;
    }
  | { ok: false; message: string };

export async function pairingCode(carId: unknown): Promise<PairingCode> {
  const { user, session } = await requireWeb();
  const car =
    typeof carId === "number" && Number.isInteger(carId)
      ? await findCar(carId)
      : null;
  if (!car) return { ok: false, message: "The server does not know this car." };
  try {
    const url =
      siteUrl(process.env)?.href.replace(/\/$/, "") ??
      requestOrigin(await headers());
    if (!url) {
      return { ok: false, message: "Set SITE_URL to the public address." };
    }
    const { code, expiresAt } = authStore().createPairingCode(
      user.id,
      session.id,
      Date.now(),
    );
    const { data, size } = encode(pairingLink(url, car.id, code), {
      ecc: "M",
      border: 0,
    });
    return { ok: true, path: qrPath(data), size, url, expiresAt };
  } catch (error) {
    console.error("Pairing code:", error);
    return { ok: false, message: "The server made no code. Try again." };
  }
}

export type PairingRequest = {
  id: string;
  check: string;
  name: string;
  platform: string;
  ip: string | null;
  createdAt: number;
};

export async function pairingRequests(): Promise<PairingRequest[]> {
  const { user } = await requireWeb();
  return authStore()
    .pendingDevices(user.id, Date.now())
    .map((device) => ({
      id: device.id,
      check: device.check,
      name: device.name ?? "A phone",
      platform: device.platform ?? "",
      ip: device.ip,
      createdAt: device.createdAt,
    }));
}

export async function answerPairing(
  sessionId: string,
  allow: boolean,
): Promise<boolean> {
  const { user } = await requireWeb();
  if (typeof sessionId !== "string") return false;
  if (!allow) return authStore().denyDevice(user.id, sessionId);
  return authStore().approveDevice(user.id, sessionId, Date.now());
}
