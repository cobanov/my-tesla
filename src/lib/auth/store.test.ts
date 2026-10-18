import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
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

function member(email = "friend@example.com") {
  const { token } = store.createInvite(email, admin().id, t0) ?? {};
  const user = store.acceptInvite(
    token ?? "",
    { name: "Friend", passwordHash: "hash" },
    t0,
  );
  if (!user) throw new Error("no member");
  return user;
}

describe("migrations", () => {
  test("bring a file of version 1 up to date and keep its users", () => {
    const folder = mkdtempSync(join(tmpdir(), "auth-store-"));
    const path = join(folder, "auth.sqlite");
    try {
      const old = new AuthStore(path);
      const owner = old.createFirstAdmin(
        { email: "owner@example.com", name: "Owner", passwordHash: "hash" },
        t0,
      );
      old.close();
      const raw = new DatabaseSync(path);
      raw.exec(
        "drop table invites; drop table password_resets; pragma user_version = 1;",
      );
      raw.close();
      const upgraded = new AuthStore(path);
      expect(upgraded.userById(owner?.id ?? "")?.email).toBe(
        "owner@example.com",
      );
      expect(
        upgraded.createInvite("friend@example.com", owner?.id ?? "", t0),
      ).not.toBeNull();
      upgraded.close();
      const again = new DatabaseSync(path);
      expect(again.prepare("pragma user_version").get()).toEqual({
        user_version: 2,
      });
      again.close();
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe("invites", () => {
  test("make a member once, for the invited email only", () => {
    const owner = admin();
    const made = store.createInvite("Friend@Example.com", owner.id, t0);
    if (!made) throw new Error("no invite");
    expect(store.inviteByToken(made.token, t0)?.email).toBe(
      "Friend@Example.com",
    );
    const user = store.acceptInvite(
      made.token,
      { name: "Friend", passwordHash: "hash" },
      t0 + 1000,
    );
    expect(user?.role).toBe("member");
    expect(user?.email).toBe("Friend@Example.com");
    expect(
      store.acceptInvite(made.token, { name: "Again", passwordHash: "x" }, t0),
    ).toBeNull();
    expect(store.inviteByToken(made.token, t0)).toBeNull();
    expect(store.userCount()).toBe(2);
  });

  test("expire after 3 days, refuse a known email, and can be revoked", () => {
    const owner = admin();
    expect(store.createInvite("owner@example.com", owner.id, t0)).toBeNull();
    const late = store.createInvite("late@example.com", owner.id, t0);
    const after = t0 + lifetimes.invite;
    expect(store.inviteByToken(late?.token ?? "", after)).toBeNull();
    expect(
      store.acceptInvite(
        late?.token ?? "",
        { name: "L", passwordHash: "x" },
        after,
      ),
    ).toBeNull();
    const revoked = store.createInvite("gone@example.com", owner.id, t0);
    expect(store.listInvites(t0).map((invite) => invite.email)).toEqual([
      "late@example.com",
      "gone@example.com",
    ]);
    expect(store.deleteInvite(revoked?.invite.id ?? "")).toBe(true);
    expect(store.inviteByToken(revoked?.token ?? "", t0)).toBeNull();
    store.prune(after);
    expect(store.listInvites(t0)).toEqual([]);
  });

  test("replace an older invite for the same email", () => {
    const owner = admin();
    const first = store.createInvite("friend@example.com", owner.id, t0);
    const second = store.createInvite("FRIEND@example.com", owner.id, t0 + 1);
    expect(store.inviteByToken(first?.token ?? "", t0 + 2)).toBeNull();
    expect(store.inviteByToken(second?.token ?? "", t0 + 2)).not.toBeNull();
    expect(store.inviteByToken("not a token", t0)).toBeNull();
  });
});

describe("removal", () => {
  test("deletes a member with every session, phone, and token at once", () => {
    const user = member();
    const web = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const device = store.createSession(
      {
        userId: user.id,
        kind: "device",
        status: "active",
        device: phone,
        ip: null,
      },
      t0,
    );
    const reset = store.createPasswordReset(user.id, t0);
    expect(store.removeUser(user.id)).toBe("removed");
    expect(store.validate(web.token, "web", t0)).toBeNull();
    expect(store.validate(device.token, "device", t0)).toBeNull();
    expect(store.passwordResetUser(reset.token, t0)).toBeNull();
    expect(store.credentialsByEmail(user.email)).toBeNull();
    expect(store.removeUser(user.id)).toBe("missing");
  });

  test("never removes the root account", () => {
    const owner = admin();
    expect(store.rootId()).toBe(owner.id);
    expect(store.removeUser(owner.id)).toBe("root");
    expect(store.userCount()).toBe(1);
  });
});

describe("password reset", () => {
  test("works once, within 30 minutes, and signs out every session", () => {
    const owner = admin();
    const web = store.createSession(
      { userId: owner.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const first = store.createPasswordReset(owner.id, t0);
    const { token } = store.createPasswordReset(owner.id, t0);
    expect(store.passwordResetUser(first.token, t0)).toBeNull();
    expect(store.passwordResetUser(token, t0)?.id).toBe(owner.id);
    expect(store.resetPassword(token, "new", t0 + 1000)?.id).toBe(owner.id);
    expect(store.passwordHash(owner.id)).toBe("new");
    expect(store.validate(web.token, "web", t0 + 2000)).toBeNull();
    expect(store.resetPassword(token, "again", t0 + 2000)).toBeNull();
    const late = store.createPasswordReset(owner.id, t0);
    expect(
      store.resetPassword(late.token, "late", t0 + lifetimes.passwordReset),
    ).toBeNull();
    expect(store.passwordHash(owner.id)).toBe("new");
  });

  test("leaves the other accounts alone", () => {
    const user = member();
    const owner = store.rootId() ?? "";
    const kept = store.createSession(
      { userId: user.id, kind: "web", status: "active", ip: null },
      t0,
    );
    const { token } = store.createPasswordReset(owner, t0);
    store.resetPassword(token, "new", t0);
    expect(store.validate(kept.token, "web", t0)?.user.id).toBe(user.id);
    expect(store.passwordHash(user.id)).toBe("hash");
  });
});
