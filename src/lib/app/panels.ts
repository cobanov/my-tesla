import { periods } from "../insights";
import type {
  AppBlock,
  AppChart,
  AppPanel,
  InsightPage,
  PeriodId,
} from "./contract";

const noRecord = "No record yet.";

export function panel(
  title: string,
  blocks: (AppBlock | null | false)[],
  note: string | null = null,
): AppPanel {
  const shown = blocks.filter((block): block is AppBlock => Boolean(block));
  return {
    title,
    note,
    blocks: shown.length ? shown : [{ kind: "note", text: noRecord }],
  };
}

export function chartBlock(chart: AppChart | null): AppBlock | null {
  return chart ? { kind: "chart", chart } : null;
}

export function periodChoices(): InsightPage["periods"] {
  return periods.map(({ id, label }) => ({ id, label }));
}

export function periodLabel(period: PeriodId): string {
  const label = periods.find((entry) => entry.id === period)?.label ?? "";
  return period === "all" ? "All records" : `Last ${label}`;
}
