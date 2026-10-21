import { DatabaseSync } from "node:sqlite";
import {
  hashSecret,
  joinToken,
  newId,
  newSecret,
  sameHash,
  splitToken,
} from "./tokens";

type Role = "admin" | "member";
export type SessionKind = "web" | "device";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
};

export type Session = {
  id: string;
  userId: string;
  kind: SessionKind;
  status: "pending" | "active";
  name: string | null;
  platform: string | null;
  ip: string | null;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
};

export type Device = { name: string; platform: string; ip: string | null };

export type Invite = {
  id: string;
  email: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
};

export type Removal = "removed" | "root" | "last-admin" | "missing";

function checkDigits(hash: Uint8Array): string {
  const [a = 0, b = 0, c = 0, d = 0] = hash;
  const value = ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
  return String(value % 10_000).padStart(4, "0");
}

const minute = 60_000;
const day = 24 * 60 * minute;

export const lifetimes = {
  web: 30 * day,
  device: 90 * day,
  pendingDevice: 2 * minute,
  pairingCode: 90 * 1000,
  touch: 60 * minute,
  invite: 3 * day,
  passwordReset: 30 * minute,
} as const;

const linkPattern = /^[A-Za-z0-9_-]{43}$/;

const migrations = [
  `
  create table users (
    id text primary key,
    email text not null unique collate nocase,
    name text not null,
    password_hash text not null,
    role text not null check (role in ('admin', 'member')),
    created_at integer not null,
    password_changed_at integer not null
  );
  create table sessions (
    id text primary key,
    user_id text not null references users (id) on delete cascade,
    secret_hash blob not null,
    kind text not null check (kind in ('web', 'device')),
    status text not null check (status in ('pending', 'active')),
    name text,
    platform text,
    ip text,
    created_at integer not null,
    last_used_at integer not null,
    expires_at integer not null
  );
  create index sessions_by_user on sessions (user_id);
  create table pairing_codes (
    code_hash blob primary key,
    user_id text not null references users (id) on delete cascade,
    web_session_id text not null references sessions (id) on delete cascade,
    created_at integer not null,
    expires_at integer not null,
    used_at integer
  );
  `,
  `
  create table invites (
    id text primary key,
    token_hash blob not null unique,
    email text not null unique collate nocase,
    created_by text not null references users (id) on delete cascade,
    created_at integer not null,
    expires_at integer not null
  );
  create table password_resets (
    token_hash blob primary key,
    user_id text not null references users (id) on delete cascade,
    created_at integer not null,
    expires_at integer not null
  );
  `,
];

type Row = Record<string, unknown>;

function userOf(row: Row): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role === "admin" ? "admin" : "member",
    createdAt: Number(row.created_at),
  };
}

function inviteOf(row: Row): Invite {
  return {
    id: String(row.id),
    email: String(row.email),
    createdBy: String(row.created_by),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

function sessionOf(row: Row): Session {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: row.kind === "device" ? "device" : "web",
    status: row.status === "pending" ? "pending" : "active",
    name: row.name === null ? null : String(row.name),
    platform: row.platform === null ? null : String(row.platform),
    ip: row.ip === null ? null : String(row.ip),
    createdAt: Number(row.created_at),
    lastUsedAt: Number(row.last_used_at),
    expiresAt: Number(row.expires_at),
  };
}

export class AuthStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("pragma foreign_keys = on; pragma busy_timeout = 5000;");
    if (path !== ":memory:") this.db.exec("pragma journal_mode = wal;");
    this.migrate();
  }

  private migrate(): void {
    let pending = true;
    while (pending) {
      pending = this.transaction(() => {
        const version = Number(
          (this.db.prepare("pragma user_version").get() as Row).user_version,
        );
        const sql = migrations[version];
        if (sql === undefined) return false;
        this.db.exec(sql);
        this.db.exec(`pragma user_version = ${version + 1}`);
        return true;
      });
    }
  }

  private transaction<T>(work: () => T): T {
    this.db.exec("begin immediate");
    try {
      const result = work();
      this.db.exec("commit");
      return result;
    } catch (error) {
      this.db.exec("rollback");
      throw error;
    }
  }

  userCount(): number {
    return Number(
      (this.db.prepare("select count(*) as count from users").get() as Row)
        .count,
    );
  }

  createFirstAdmin(
    input: { email: string; name: string; passwordHash: string },
    now: number,
  ): User | null {
    return this.transaction(() => {
      if (this.userCount() > 0) return null;
      const id = newId();
      this.db
        .prepare(
          "insert into users (id, email, name, password_hash, role, created_at, password_changed_at) values (?, ?, ?, ?, 'admin', ?, ?)",
        )
        .run(id, input.email, input.name, input.passwordHash, now, now);
      return this.userById(id);
    });
  }

  userById(id: string): User | null {
    const row = this.db.prepare("select * from users where id = ?").get(id);
    return row ? userOf(row as Row) : null;
  }

  credentialsByEmail(
    email: string,
  ): { user: User; passwordHash: string } | null {
    const row = this.db
      .prepare("select * from users where email = ?")
      .get(email) as Row | undefined;
    return row
      ? { user: userOf(row), passwordHash: String(row.password_hash) }
      : null;
  }

  passwordHash(userId: string): string | null {
    const row = this.db
      .prepare("select password_hash from users where id = ?")
      .get(userId) as Row | undefined;
    return row ? String(row.password_hash) : null;
  }

  setPassword(userId: string, passwordHash: string, now: number): void {
    this.db
      .prepare(
        "update users set password_hash = ?, password_changed_at = ? where id = ?",
      )
      .run(passwordHash, now, userId);
  }

  listUsers(): User[] {
    return (
      this.db
        .prepare("select * from users order by created_at, id")
        .all() as Row[]
    ).map(userOf);
  }

  rootId(): string | null {
    const row = this.db
      .prepare(
        "select id from users where role = 'admin' order by created_at, id limit 1",
      )
      .get() as Row | undefined;
    return row ? String(row.id) : null;
  }

  removeUser(id: string): Removal {
    return this.transaction(() => {
      const user = this.userById(id);
      if (!user) return "missing";
      if (id === this.rootId()) return "root";
      if (user.role === "admin") {
        const admins = Number(
          (
            this.db
              .prepare(
                "select count(*) as count from users where role = 'admin'",
              )
              .get() as Row
          ).count,
        );
        if (admins <= 1) return "last-admin";
      }
      this.db.prepare("delete from users where id = ?").run(id);
      return "removed";
    });
  }

  createInvite(
    email: string,
    createdBy: string,
    now: number,
  ): { invite: Invite; token: string } | null {
    const token = newSecret();
    const id = newId();
    const created = this.transaction(() => {
      if (this.credentialsByEmail(email)) return false;
      this.db.prepare("delete from invites where email = ?").run(email);
      this.db
        .prepare(
          "insert into invites (id, token_hash, email, created_by, created_at, expires_at) values (?, ?, ?, ?, ?, ?)",
        )
        .run(
          id,
          hashSecret(token),
          email,
          createdBy,
          now,
          now + lifetimes.invite,
        );
      return true;
    });
    if (!created) return null;
    const row = this.db.prepare("select * from invites where id = ?").get(id);
    return { invite: inviteOf(row as Row), token };
  }

  listInvites(now: number): Invite[] {
    return (
      this.db
        .prepare(
          "select * from invites where expires_at > ? order by created_at",
        )
        .all(now) as Row[]
    ).map(inviteOf);
  }

  deleteInvite(id: string): boolean {
    return (
      Number(
        this.db.prepare("delete from invites where id = ?").run(id).changes,
      ) > 0
    );
  }

  inviteByToken(token: string, now: number): Invite | null {
    if (!linkPattern.test(token)) return null;
    const row = this.db
      .prepare("select * from invites where token_hash = ? and expires_at > ?")
      .get(hashSecret(token), now);
    return row ? inviteOf(row as Row) : null;
  }

  acceptInvite(
    token: string,
    input: { name: string; passwordHash: string },
    now: number,
  ): User | null {
    if (!linkPattern.test(token)) return null;
    return this.transaction(() => {
      const row = this.db
        .prepare(
          "delete from invites where token_hash = ? and expires_at > ? returning email",
        )
        .get(hashSecret(token), now) as Row | undefined;
      if (!row) return null;
      const email = String(row.email);
      if (this.credentialsByEmail(email)) return null;
      const id = newId();
      this.db
        .prepare(
          "insert into users (id, email, name, password_hash, role, created_at, password_changed_at) values (?, ?, ?, ?, 'member', ?, ?)",
        )
        .run(id, email, input.name, input.passwordHash, now, now);
      return this.userById(id);
    });
  }

  createPasswordReset(
    userId: string,
    now: number,
  ): { token: string; expiresAt: number } {
    const token = newSecret();
    const expiresAt = now + lifetimes.passwordReset;
    this.transaction(() => {
      this.db
        .prepare("delete from password_resets where user_id = ?")
        .run(userId);
      this.db
        .prepare(
          "insert into password_resets (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)",
        )
        .run(hashSecret(token), userId, now, expiresAt);
    });
    return { token, expiresAt };
  }

  passwordResetUser(token: string, now: number): User | null {
    if (!linkPattern.test(token)) return null;
    const row = this.db
      .prepare(
        "select user_id from password_resets where token_hash = ? and expires_at > ?",
      )
      .get(hashSecret(token), now) as Row | undefined;
    return row ? this.userById(String(row.user_id)) : null;
  }

  resetPassword(token: string, passwordHash: string, now: number): User | null {
    if (!linkPattern.test(token)) return null;
    return this.transaction(() => {
      const row = this.db
        .prepare(
          "delete from password_resets where token_hash = ? and expires_at > ? returning user_id",
        )
        .get(hashSecret(token), now) as Row | undefined;
      if (!row) return null;
      const userId = String(row.user_id);
      this.setPassword(userId, passwordHash, now);
      this.db.prepare("delete from sessions where user_id = ?").run(userId);
      this.db
        .prepare("delete from password_resets where user_id = ?")
        .run(userId);
      return this.userById(userId);
    });
  }

  createSession(
    input: {
      userId: string;
      kind: SessionKind;
      status: "pending" | "active";
      device?: Device;
      ip: string | null;
    },
    now: number,
  ): { session: Session; token: string } {
    const id = newId();
    const secret = newSecret();
    const lifetime =
      input.status === "pending"
        ? lifetimes.pendingDevice
        : lifetimes[input.kind];
    this.db
      .prepare(
        "insert into sessions (id, user_id, secret_hash, kind, status, name, platform, ip, created_at, last_used_at, expires_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        input.userId,
        hashSecret(secret),
        input.kind,
        input.status,
        input.device?.name ?? null,
        input.device?.platform ?? null,
        input.device?.ip ?? input.ip,
        now,
        now,
        now + lifetime,
      );
    return { session: this.sessionById(id)!, token: joinToken(id, secret) };
  }

  private sessionById(id: string): Session | null {
    const row = this.db.prepare("select * from sessions where id = ?").get(id);
    return row ? sessionOf(row as Row) : null;
  }

  validate(
    token: string | null | undefined,
    kind: SessionKind,
    now: number,
  ): { session: Session; user: User } | null {
    const parts = splitToken(token);
    if (!parts) return null;
    const row = this.db
      .prepare("select * from sessions where id = ? and kind = ?")
      .get(parts.id, kind) as Row | undefined;
    if (!row) return null;
    const stored = row.secret_hash as Uint8Array;
    if (!sameHash(stored, hashSecret(parts.secret))) return null;
    const session = sessionOf(row);
    if (session.expiresAt <= now) {
      this.deleteSession(session.id);
      return null;
    }
    if (session.status !== "active") return null;
    const user = this.userById(session.userId);
    if (!user) return null;
    if (now - session.lastUsedAt >= lifetimes.touch) {
      const expiresAt = now + lifetimes[kind];
      this.db
        .prepare(
          "update sessions set last_used_at = ?, expires_at = ? where id = ?",
        )
        .run(now, expiresAt, session.id);
      return { session: { ...session, lastUsedAt: now, expiresAt }, user };
    }
    return { session, user };
  }

  listSessions(userId: string, now: number): Session[] {
    return (
      this.db
        .prepare(
          "select * from sessions where user_id = ? and expires_at > ? order by last_used_at desc",
        )
        .all(userId, now) as Row[]
    ).map(sessionOf);
  }

  deleteSession(id: string): void {
    this.db.prepare("delete from sessions where id = ?").run(id);
  }

  deleteUserSession(userId: string, id: string): boolean {
    return (
      Number(
        this.db
          .prepare("delete from sessions where id = ? and user_id = ?")
          .run(id, userId).changes,
      ) > 0
    );
  }

  deleteOtherSessions(userId: string, keepId: string | null): void {
    this.db
      .prepare("delete from sessions where user_id = ? and id is not ?")
      .run(userId, keepId);
  }

  createPairingCode(
    userId: string,
    webSessionId: string,
    now: number,
  ): { code: string; expiresAt: number } {
    const code = newSecret();
    const expiresAt = now + lifetimes.pairingCode;
    this.transaction(() => {
      this.db
        .prepare(
          "delete from pairing_codes where expires_at <= ? or (web_session_id = ? and used_at is null)",
        )
        .run(now, webSessionId);
      this.db
        .prepare(
          "insert into pairing_codes (code_hash, user_id, web_session_id, created_at, expires_at) values (?, ?, ?, ?, ?)",
        )
        .run(hashSecret(code), userId, webSessionId, now, expiresAt);
    });
    return { code, expiresAt };
  }

  claimPairingCode(
    code: string,
    device: Device,
    now: number,
  ): { session: Session; token: string; user: User; check: string } | null {
    if (!linkPattern.test(code)) return null;
    return this.transaction(() => {
      const row = this.db
        .prepare(
          "update pairing_codes set used_at = ? where code_hash = ? and used_at is null and expires_at > ? returning user_id",
        )
        .get(now, hashSecret(code), now) as Row | undefined;
      if (!row) return null;
      const user = this.userById(String(row.user_id));
      if (!user) return null;
      const created = this.createSession(
        {
          userId: user.id,
          kind: "device",
          status: "pending",
          device,
          ip: device.ip,
        },
        now,
      );
      const secret = created.token.split(".")[1] ?? "";
      return { ...created, user, check: checkDigits(hashSecret(secret)) };
    });
  }

  pendingDevices(userId: string, now: number): (Session & { check: string })[] {
    return (
      this.db
        .prepare(
          "select * from sessions where user_id = ? and kind = 'device' and status = 'pending' and expires_at > ? order by created_at",
        )
        .all(userId, now) as Row[]
    ).map((row) => ({
      ...sessionOf(row),
      check: checkDigits(row.secret_hash as Uint8Array),
    }));
  }

  approveDevice(userId: string, sessionId: string, now: number): boolean {
    return (
      Number(
        this.db
          .prepare(
            "update sessions set status = 'active', last_used_at = ?, expires_at = ? where id = ? and user_id = ? and kind = 'device' and status = 'pending' and expires_at > ?",
          )
          .run(now, now + lifetimes.device, sessionId, userId, now).changes,
      ) > 0
    );
  }

  denyDevice(userId: string, sessionId: string): boolean {
    return (
      Number(
        this.db
          .prepare(
            "delete from sessions where id = ? and user_id = ? and kind = 'device' and status = 'pending'",
          )
          .run(sessionId, userId).changes,
      ) > 0
    );
  }

  deviceStatus(token: string | null | undefined, now: number) {
    const parts = splitToken(token);
    if (!parts) return null;
    const row = this.db
      .prepare("select * from sessions where id = ? and kind = 'device'")
      .get(parts.id) as Row | undefined;
    if (
      !row ||
      !sameHash(row.secret_hash as Uint8Array, hashSecret(parts.secret))
    ) {
      return null;
    }
    const session = sessionOf(row);
    if (session.expiresAt <= now) return null;
    const user = this.userById(session.userId);
    return user ? { session, user } : null;
  }

  sessionActive(id: string, now: number): boolean {
    return Boolean(
      this.db
        .prepare(
          "select 1 from sessions where id = ? and status = 'active' and expires_at > ?",
        )
        .get(id, now),
    );
  }

  prune(now: number): void {
    this.db.prepare("delete from sessions where expires_at <= ?").run(now);
    this.db.prepare("delete from pairing_codes where expires_at <= ?").run(now);
    this.db.prepare("delete from invites where expires_at <= ?").run(now);
    this.db
      .prepare("delete from password_resets where expires_at <= ?")
      .run(now);
  }

  close(): void {
    this.db.close();
  }
}
