const lastInstant = "9999-12-31T23:59:59.999Z";

export function sinceOf(from: Date | null): string {
  return (from ?? new Date(0)).toISOString();
}

export function untilOf(to: Date | null): string {
  return to?.toISOString() ?? lastInstant;
}
