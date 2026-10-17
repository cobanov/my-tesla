import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AuthStore, lifetimes } from "./store";

const t0 = Date.UTC(2026, 9, 18, 12);
const phone = { name: "Ege's iPhone", platform: "ios", ip: "203.0.113.5" };
let store: AuthStore;

beforeEach(() => {
  store = new AuthStore(":memory:");
});

afterEach(() => store.close());

function admin() {
  const user = store.createFirstAdmin(
    { email: "Owner@Example.com", name: "Owner", passwordHash: "hash" },
    t0,
  );
  if (!user) throw new Error("no admin");
  return user;
}

describe("first admin", () => {
  test("is created once, as admin, and found by email in any case", () => {
    expect(store.userCount()).toBe(0);
    const user = admin();
    expect(user.role).toBe("admin");
    expect(
      store.createFirstAdmin(
        { email: "late@example.com", name: "Late", passwordHash: "x" },
        t0,
      ),
    ).toBeNull();
    expect(store.userCount()).toBe(1);
    expect(store.credentialsByEmail("owner@example.COM")?.user.id).toBe(
      user.id,
    );
  });
});

describe("sessions", () => {
  test("accept the right secret of the right kind until they expire", () => {
    const user = admin();
    const { token } = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    expect(store.validate(token, "web", t0 + 1000)?.user.id).toBe(user.id);
    expect(store.validate(token, "device", t0 + 1000)).toBeNull();
    const forged = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(store.validate(forged, "web", t0)).toBeNull();
    expect(store.validate(token, "web", t0 + lifetimes.web + 1)).toBeNull();
    expect(store.validate(token, "web", t0 + 1000)).toBeNull();
  });

  test("slide the expiry at most once an hour", () => {
    const user = admin();
    const { token } = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const soon = store.validate(token, "web", t0 + lifetimes.touch - 1);
    expect(soon?.session.expiresAt).toBe(t0 + lifetimes.web);
    const later = t0 + 20 * 24 * 3_600_000;
    expect(store.validate(token, "web", later)?.session.expiresAt).toBe(
      later + lifetimes.web,
    );
  });

  test("end the other sessions of a user and keep one", () => {
    const user = admin();
    const keep = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const other = store.createSession(
      {
        userId: user.id,
        kind: "device",
        status: "active",
        device: phone,
        ip: null,
      },
      t0,
    );
    store.deleteOtherSessions(user.id, keep.session.id);
    expect(store.validate(keep.token, "web", t0)).not.toBeNull();
    expect(store.validate(other.token, "device", t0)).toBeNull();
  });
});

describe("pairing", () => {
  test("trades a code once for a device that works only after approval", () => {
    const user = admin();
    const web = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const { code } = store.createPairingCode(user.id, web.session.id, t0);
    const claimed = store.claimPairingCode(code, phone, t0 + 5000);
    expect(claimed?.user.id).toBe(user.id);
    expect(claimed?.session.status).toBe("pending");
    expect(store.claimPairingCode(code, phone, t0 + 6000)).toBeNull();
    const token = claimed!.token;
    expect(store.validate(token, "device", t0 + 7000)).toBeNull();
    expect(store.deviceStatus(token, t0 + 7000)?.session.status).toBe(
      "pending",
    );
    const [waiting] = store.pendingDevices(user.id, t0 + 7000);
    expect(waiting?.check).toBe(claimed?.check ?? "none");
    expect(waiting?.check).toMatch(/^\d{4}$/);
    expect(store.approveDevice(user.id, claimed!.session.id, t0 + 8000)).toBe(
      true,
    );
    expect(store.validate(token, "device", t0 + 9000)?.session.name).toBe(
      "Ege's iPhone",
    );
  });

  test("refuses an expired code, a replaced code, and a late approval", () => {
    const user = admin();
    const web = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const first = store.createPairingCode(user.id, web.session.id, t0);
    const second = store.createPairingCode(user.id, web.session.id, t0 + 1000);
    expect(store.claimPairingCode(first.code, phone, t0 + 2000)).toBeNull();
    expect(
      store.claimPairingCode(second.code, phone, second.expiresAt + 1),
    ).toBeNull();
    const third = store.createPairingCode(user.id, web.session.id, t0 + 3000);
    const claimed = store.claimPairingCode(third.code, phone, t0 + 4000);
    expect(
      store.approveDevice(
        user.id,
        claimed!.session.id,
        t0 + 4000 + lifetimes.pendingDevice + 1,
      ),
    ).toBe(false);
    expect(store.claimPairingCode("not a code", phone, t0)).toBeNull();
  });

  test("denies only a phone that waits, never a web session", () => {
    const user = admin();
    const web = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    expect(store.denyDevice(user.id, web.session.id)).toBe(false);
    const { code } = store.createPairingCode(user.id, web.session.id, t0);
    const claimed = store.claimPairingCode(code, phone, t0 + 1000);
    expect(store.denyDevice(user.id, claimed!.session.id)).toBe(true);
    expect(store.deviceStatus(claimed!.token, t0 + 2000)).toBeNull();
  });
});
