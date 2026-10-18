"use server";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { refresh } from "next/cache";
import { encode } from "uqr";
import { pairingLink, qrPath, requestOrigin } from "../app/pairing";
import { findCar } from "../queries";
import { SiteUrlError, siteUrl } from "../site";
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
  calendarPlatform,
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

const tooManyToday =
  "Too many failed tries from this network today. Try again tomorrow.";

const deadInvite =
  "This invite link does not work. Ask the admin for a new one.";

const deadReset =
  "This reset link does not work. Make a new one on the server.";

async function linkOrigin(): Promise<string | null> {
  try {
    return (
      siteUrl(process.env)?.href.replace(/\/$/, "") ??
      requestOrigin(await headers())
    );
  } catch (error) {
    if (error instanceof SiteUrlError) return null;
    throw error;
  }
}

async function newPasswordHash(
  form: FormData,
): Promise<{ hash: string } | { error: string }> {
  const password = text(form, "password");
  const weak = passwordProblem(password);
  if (weak) return { error: weak };
  if (password !== text(form, "confirm")) {
    return { error: "The two passwords differ." };
  }
  try {
    return { hash: await hashPassword(password) };
  } catch (error) {
    if (error instanceof PasswordBusyError) return busy;
    throw error;
  }
}

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
    return { error: tooManyToday };
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
  const values = { name, email };
  if (!name || name.length > 80) return { error: "Type your name.", values };
  if (!emailPattern.test(email)) {
    return { error: "Type a valid email.", values };
  }
  const password = await newPasswordHash(form);
  if ("error" in password) return { error: password.error, values };
  const user = authStore().createFirstAdmin(
    { email, name, passwordHash: password.hash },
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

async function requireAdmin() {
  const signedIn = await requireWeb();
  if (signedIn.user.role !== "admin") redirect("/account");
  return signedIn;
}

export async function joinWithInvite(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const from = await address();
  if (from && limits.address().blocked(from, Date.now())) {
    return { error: tooManyToday };
  }
  const token = text(form, "token").trim();
  if (!authStore().inviteByToken(token, Date.now())) {
    if (from) limits.address().fail(from, Date.now());
    return { error: deadInvite };
  }
  const name = text(form, "name").trim();
  const values = { name };
  if (!name || name.length > 80) return { error: "Type your name.", values };
  const password = await newPasswordHash(form);
  if ("error" in password) return { error: password.error, values };
  const user = authStore().acceptInvite(
    token,
    { name, passwordHash: password.hash },
    Date.now(),
  );
  if (!user) return { error: deadInvite, values };
  console.info(`My Tesla: ${user.email} joined with an invite.`);
  const { token: session } = authStore().createSession(
    { userId: user.id, kind: "web", status: "active", ip: from },
    Date.now(),
  );
  await setSessionCookie(session);
  redirect("/");
}

export async function resetPassword(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const from = await address();
  if (from && limits.address().blocked(from, Date.now())) {
    return { error: tooManyToday };
  }
  const token = text(form, "token").trim();
  if (!authStore().passwordResetUser(token, Date.now())) {
    if (from) limits.address().fail(from, Date.now());
    return { error: deadReset };
  }
  const password = await newPasswordHash(form);
  if ("error" in password) return { error: password.error };
  const user = authStore().resetPassword(token, password.hash, Date.now());
  if (!user) return { error: deadReset };
  console.info(`My Tesla: the password of ${user.email} is reset.`);
  succeeded({ account: `login:${user.email.toLowerCase()}`, address: from });
  return {
    error: null,
    done: "The password is changed, and every session and phone of the account is signed out. Sign in with the new password.",
  };
}

export async function createInvite(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { user } = await requireAdmin();
  const email = text(form, "email").trim().toLowerCase();
  const values = { email };
  if (!emailPattern.test(email)) {
    return { error: "Type a valid email.", values };
  }
  const origin = await linkOrigin();
  if (!origin) {
    return { error: "Set SITE_URL to the public address.", values };
  }
  const made = authStore().createInvite(email, user.id, Date.now());
  if (!made) {
    return { error: "An account with this email exists already.", values };
  }
  refresh();
  return {
    error: null,
    done: `${origin}/invite?token=${made.token}`,
    values,
  };
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await requireAdmin();
  if (typeof inviteId !== "string") return;
  authStore().deleteInvite(inviteId);
  refresh();
}

export async function removeMember(userId: string): Promise<void> {
  const { user } = await requireAdmin();
  if (typeof userId !== "string" || userId === user.id) return;
  const target = authStore().userById(userId);
  if (target && authStore().removeUser(userId) === "removed") {
    console.info(`My Tesla: ${user.email} removed ${target.email}.`);
  }
  refresh();
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

export type CalendarLink =
  { ok: true; url: string; subscribe: string } | { ok: false; message: string };

export async function createCalendarLink(
  carId: unknown,
): Promise<CalendarLink> {
  const { user } = await requireWeb();
  const car =
    typeof carId === "number" && Number.isInteger(carId)
      ? await findCar(carId)
      : null;
  if (!car) return { ok: false, message: "The server does not know this car." };
  const origin = await linkOrigin();
  if (!origin) {
    return { ok: false, message: "Set SITE_URL to the public address." };
  }
  const { token } = authStore().createSession(
    {
      userId: user.id,
      kind: "device",
      status: "active",
      device: { name: car.name, platform: calendarPlatform, ip: null },
      ip: null,
    },
    Date.now(),
  );
  const url = `${origin}/api/cars/${car.id}/calendar.ics?token=${token}`;
  return { ok: true, url, subscribe: url.replace(/^https?:/, "webcal:") };
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
  const url = await linkOrigin();
  if (!url) {
    return { ok: false, message: "Set SITE_URL to the public address." };
  }
  try {
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
