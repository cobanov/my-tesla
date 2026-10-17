const minute = 60_000;

type Entry = { failures: number; blockedUntil: number; firstAt: number };

export class Backoff {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly free = 5,
    private readonly baseMs = 1000,
    private readonly maxMs = 15 * minute,
    private readonly forgetMs = 24 * 60 * minute,
  ) {}

  waitMs(key: string, now: number): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    if (now - entry.firstAt > this.forgetMs) {
      this.entries.delete(key);
      return 0;
    }
    return Math.max(0, entry.blockedUntil - now);
  }

  fail(key: string, now: number): void {
    const entry = this.entries.get(key) ?? {
      failures: 0,
      blockedUntil: 0,
      firstAt: now,
    };
    entry.failures += 1;
    const over = entry.failures - this.free;
    if (over > 0) {
      entry.blockedUntil =
        now + Math.min(this.maxMs, this.baseMs * 2 ** (over - 1));
    }
    this.entries.set(key, entry);
    if (this.entries.size > 10_000) this.prune(now);
  }

  succeed(key: string): void {
    this.entries.delete(key);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.blockedUntil <= now && now - entry.firstAt > this.forgetMs) {
        this.entries.delete(key);
      }
    }
  }
}

export class DailyCap {
  private readonly counts = new Map<string, { count: number; since: number }>();

  constructor(private readonly limit: number) {}

  take(key: string, now: number): boolean {
    const entry = this.counts.get(key);
    if (!entry || now - entry.since >= 24 * 60 * minute) {
      this.counts.set(key, { count: 1, since: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

export function waitText(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
