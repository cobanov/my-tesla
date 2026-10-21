import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { SeriesChart } from "@/components/charts/series-chart";
import { PageTransition } from "@/components/page-transition";
import { Panel, PanelNote } from "@/components/panel";
import { SegmentedLinks } from "@/components/segmented-links";
import { StatsTotals } from "@/components/stats-totals";
import { VisitedPlaces } from "@/components/visited-places";
import { requireCar } from "@/lib/car-route";
import { carPath } from "@/lib/car-slug";
import { localDayKey } from "@/lib/insights";
import { visitedPlaces } from "@/lib/places-data";
import { placesFigures } from "@/lib/places-figures";
import {
  biggestCharge,
  dataYears,
  driveTotals,
  longestDrives,
  periodChargeTotals,
  statsBuckets,
} from "@/lib/stats-data";
import { bucketRows } from "@/lib/stats-figures";
import { cn } from "@/lib/utils";
import { getFormatter } from "@/lib/viewer";
import { busiest, monthName, pickYear, yearWindow } from "@/lib/year-review";

export const instant = false;

export const metadata: Metadata = { title: "Year in review" };

const shownPlaces = 5;

function RecordRow({
  label,
  title,
  detail,
  value,
  href,
}: {
  label: string;
  title: string;
  detail?: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium">{title}</span>
        {detail && (
          <span className="block truncate text-xs text-subtle tabular">
            {detail}
          </span>
        )}
      </span>
      <span className="shrink-0 text-sm font-medium tabular">{value}</span>
    </>
  );
  const rowClass = "flex items-center gap-4 rounded px-2 py-2.5";
  return (
    <li>
      {href ? (
        <Link
          href={href}
          transitionTypes={["tab-forward"]}
          className={cn(rowClass, "transition-tesla hover:bg-accent")}
        >
          {body}
          <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
        </Link>
      ) : (
        <div className={cn(rowClass, "pr-10")}>{body}</div>
      )}
    </li>
  );
}

export default async function YearInReviewPage({
  params,
  searchParams,
}: PageProps<"/cars/[carId]/stats/year">) {
  const [car, f, query] = await Promise.all([
    requireCar(params),
    getFormatter(),
    searchParams,
  ]);
  const now = new Date();
  const base = carPath(car, "/stats/year");
  const years = await dataYears(car.id, f.timeZone);
  const year = pickYear(
    typeof query.year === "string" ? query.year : undefined,
    years,
    now,
    f.timeZone,
  );
  const bounds = year === null ? null : yearWindow(year, f.timeZone);
  const lastDay =
    bounds && new Date(Math.min(bounds.to.getTime(), now.getTime()) - 1);

  const header = (
    <div className="pt-6 md:pt-10">
      <BackLink href={carPath(car, "/stats")} label="Stats" />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[40px] leading-[1.2] font-medium">
            Year in review
          </h1>
          {bounds && lastDay && (
            <p className="mt-2 text-sm text-muted-foreground tabular">
              {f.date(bounds.from)} to {f.date(lastDay)}
            </p>
          )}
        </div>
        {year !== null && (
          <SegmentedLinks
            label="Year"
            active={String(year)}
            items={years.map((candidate) => ({
              id: String(candidate),
              label: String(candidate),
              href: `${base}?year=${candidate}`,
            }))}
          />
        )}
      </div>
    </div>
  );

  if (!bounds) {
    return (
      <PageTransition>
        {header}
        <p className="mt-10 text-sm text-subtle">No drive or charge yet.</p>
      </PageTransition>
    );
  }

  const { from, to } = bounds;
  const [drives, charges, months, days, longest, charge, visited] =
    await Promise.all([
      driveTotals(car.id, from, to),
      periodChargeTotals(car.id, from, to),
      statsBuckets(car.id, from, "month", f.timeZone, false, to),
      statsBuckets(car.id, from, "day", f.timeZone, false, to),
      longestDrives(car.id, from, to),
      biggestCharge(car.id, from, to),
      visitedPlaces(car.id, from, to),
    ]);
  const busiestMonth = busiest(months);
  const busiestDay = busiest(days);
  const longestDrive = longest[0] ?? null;
  const { top, mostVisits, chargingKeys } = placesFigures(visited, []);

  return (
    <PageTransition>
      {header}

      <StatsTotals car={car} drives={drives} charges={charges} f={f} />

      <div className="mt-12 grid grid-cols-1 gap-4">
        <Panel
          title={`Distance (${f.units.distance})`}
          action={<span className="text-xs text-subtle">Per month</span>}
        >
          {drives.drives ? (
            <SeriesChart
              data={bucketRows(months, f)}
              xKey="at"
              xFormat="month"
              chartStyle={f.chartStyle}
              series={[
                {
                  key: "distance",
                  label: "Distance",
                  color: "var(--chart-1)",
                  unit: f.units.distance,
                  digits: 1,
                  kind: "bar",
                },
              ]}
              yDomain={[0, "auto"]}
              height={240}
            />
          ) : (
            <PanelNote>No drive in this year.</PanelNote>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Records">
            {busiestDay || busiestMonth || longestDrive || charge ? (
              <ol className="-mx-2">
                {busiestMonth && (
                  <RecordRow
                    label="Busiest month"
                    title={monthName(busiestMonth.at, f.timeZone)}
                    detail={`${f.duration(busiestMonth.minutes)} driving`}
                    value={f.distance(busiestMonth.distanceKm)}
                  />
                )}
                {busiestDay && (
                  <RecordRow
                    label="Busiest day"
                    title={f.day(busiestDay.at, now)}
                    detail={`${f.duration(busiestDay.minutes)} driving`}
                    value={f.distance(busiestDay.distanceKm)}
                    href={`${carPath(car, "/timeline")}?day=${localDayKey(busiestDay.at, f.timeZone)}`}
                  />
                )}
                {longestDrive && (
                  <RecordRow
                    label="Longest drive"
                    title={`${longestDrive.from} → ${longestDrive.to}`}
                    detail={`${f.date(longestDrive.startAt)} · ${f.duration(longestDrive.durationMin)}`}
                    value={f.distance(longestDrive.distanceKm)}
                    href={carPath(car, `/drives/${longestDrive.id}`)}
                  />
                )}
                {charge && (
                  <RecordRow
                    label="Biggest charge"
                    title={charge.place}
                    detail={[
                      f.date(charge.startAt),
                      charge.cost === null ? null : f.cost(charge.cost),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    value={f.energy(charge.addedKwh)}
                    href={carPath(car, `/charging/${charge.id}`)}
                  />
                )}
              </ol>
            ) : (
              <PanelNote>No record yet.</PanelNote>
            )}
          </Panel>

          <Panel title="Top places">
            {top.length ? (
              <VisitedPlaces
                places={top.slice(0, shownPlaces)}
                mostVisits={mostVisits}
                chargingKeys={chargingKeys}
                f={f}
                now={now}
              />
            ) : (
              <PanelNote>No place in this year.</PanelNote>
            )}
          </Panel>
        </div>
      </div>
    </PageTransition>
  );
}
