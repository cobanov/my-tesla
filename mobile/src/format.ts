export function durationText(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest
    ? `${hours} h ${String(rest).padStart(2, "0")} min`
    : `${hours} h`;
}

export function chargeLeftText(
  fullAt: string | null,
  now: Date,
): string | null {
  if (!fullAt) return null;
  const minutes = (new Date(fullAt).getTime() - now.getTime()) / 60_000;
  if (!Number.isFinite(minutes)) return null;
  return minutes < 1 ? "Almost done" : `${durationText(minutes)} left`;
}
