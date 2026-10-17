import type { AppChart } from "@contract";

export type Plot = { left: number; right: number; top: number; bottom: number };

export function scale(
  value: number,
  [from, to]: [number, number],
  [start, end]: [number, number],
): number {
  return to === from
    ? start
    : start + ((value - from) / (to - from)) * (end - start);
}

export function linePath(points: { x: number; y: number | null }[]): string {
  let path = "";
  let drawing = false;
  for (const point of points) {
    if (point.y === null) {
      drawing = false;
      continue;
    }
    path += `${drawing ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    drawing = true;
  }
  return path;
}

export function areaPath(
  points: { x: number; y: number | null }[],
  baseline: number,
): string {
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  for (const point of points) {
    if (point.y === null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push({ x: point.x, y: point.y });
    }
  }
  if (run.length) runs.push(run);
  return runs
    .filter((part) => part.length > 1)
    .map(
      (part) =>
        `${linePath(part)}L${part.at(-1)!.x.toFixed(1)},${baseline.toFixed(1)}L${part[0]!.x.toFixed(1)},${baseline.toFixed(1)}Z`,
    )
    .join("");
}

export function nearestIndex(xs: number[], target: number): number {
  let best = 0;
  for (let index = 1; index < xs.length; index += 1) {
    if (Math.abs(xs[index]! - target) < Math.abs(xs[best]! - target)) {
      best = index;
    }
  }
  return best;
}

export function baselineValue([low, high]: [number, number]): number {
  return Math.min(Math.max(0, low), high);
}

export function hasBars(chart: AppChart): boolean {
  return chart.series.some((series) => series.kind === "bar");
}
