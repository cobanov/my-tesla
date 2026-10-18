import type { Metadata } from "next";
import Link from "next/link";
import { ChargerBadge } from "@/components/charger-badge";
import { MapsOff, PlacesMap } from "@/components/maps";
import { Metric } from "@/components/metric";
import { PageTransition } from "@/components/page-transition";
import { Panel, PanelNote } from "@/components/panel";
import { PeriodLinks } from "@/components/period-links";
import { VisitedPlaces } from "@/components/visited-places";
import { requireCar } from "@/lib/car-route";
import { carPath } from "@/lib/car-slug";
import { periodStart, periods, readPeriod } from "@/lib/insights";
import { placesOnMap } from "@/lib/map-points";
import { mapThemeOf } from "@/lib/preferences";
import {
  areasVisited,
  chargingPlaces,
  frequentRoutes,
  geofenceList,
  visitedPlaces,
} from "@/lib/places-data";
import { placesFigures } from "@/lib/places-figures";
import { toElevation } from "@/lib/units";
import { getFormatter, getPreferences } from "@/lib/viewer";
import type { VisitedArea } from "@/lib/visited-areas";

export const instant = false;

export const metadata: Metadata = { title: "Places" };

const shownAreas = 10;

export default async function PlacesPage({
  params,
  searchParams,
}: PageProps<"/cars/[carId]/places">) {
  const [car, query, f, preferences] = await Promise.all([
    requireCar(params),
    searchParams,
    getFormatter(),
    getPreferences(),
  ]);
  const now = new Date();
  const period = readPeriod(
    typeof query.period === "string" ? query.period : undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const [visited, charging, geofences, routes, areas] = await Promise.all([
    visitedPlaces(car.id, from),
    chargingPlaces(car.id, from),
    geofenceList(),
    frequentRoutes(car.id, from, f.timeZone),
    areasVisited(car.id, from),
  ]);

  const {
    top,
    mostVisits,
    longest,
    parkedTotal,
    arrivals,
    chargingKeys,
    chargedTotal,
    visitsByFence,
    chargesByFence,
  } = placesFigures(visited, charging);
  const mapPlaces = placesOnMap(visited, charging);
  const periodLabel =
    periods.find((candidate) => candidate.id === period)?.label ?? "";

  return (
    <PageTransition>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-6 md:pt-10">
        <div>
          <p className="text-sm text-muted-foreground">
            {period === "all" ? "All records" : `Last ${periodLabel}`}
          </p>
          <h1 className="mt-1 text-[32px] leading-[1.2] font-medium md:text-[40px]">
            Places
          </h1>
        </div>
        <PeriodLinks base={carPath(car, "/places")} active={period} />
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <Metric
          size="lg"
          label="Places"
          value={visited.length}
          detail={`${arrivals} arrivals`}
        />
        <Metric
          size="lg"
          label="Most time"
          value={
            longest && parkedTotal
              ? Math.round((longest.parkedS / parkedTotal) * 100)
              : "—"
          }
          unit={longest ? "%" : undefined}
          detail={longest ? `at ${longest.label}` : undefined}
        />
        <Metric
          size="lg"
          label="Charging places"
          value={charging.length}
          detail={`${f.number(chargedTotal)} kWh added`}
        />
        <Metric
          size="lg"
          label="Saved places"
          value={geofences.length}
          detail="Geofences in TeslaMate"
        />
      </dl>

      <section className="mt-12 overflow-hidden rounded-xl bg-card">
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
          <h2 className="text-sm text-muted-foreground">Map</h2>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Visited
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-charge" />
              Charged
            </span>
          </div>
        </header>
        <div className="mt-4 h-[420px]">
          {preferences.maps === "hide" ? (
            <MapsOff />
          ) : mapPlaces.length ? (
            <PlacesMap places={mapPlaces} theme={mapThemeOf(preferences)} />
          ) : (
            <PanelNote>No record yet.</PanelNote>
          )}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel title="Most visited" className="lg:col-span-3">
          {top.length ? (
            <VisitedPlaces
              places={top}
              mostVisits={mostVisits}
              chargingKeys={chargingKeys}
              f={f}
              now={now}
            />
          ) : (
            <PanelNote>No record yet.</PanelNote>
          )}
        </Panel>

        <Panel title="Charging places" className="lg:col-span-2">
          {charging.length ? (
            <ul className="divide-y divide-border">
              {charging.map((place) => (
                <li key={place.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <ChargerBadge fast={place.fast} />
                    <span className="truncate text-sm font-medium">
                      {place.label}
                    </span>
                  </div>
                  <p className="mt-1.5 flex justify-between gap-4 text-xs text-muted-foreground tabular">
                    <span>
                      {place.sessions}{" "}
                      {place.sessions === 1 ? "charge" : "charges"} ·{" "}
                      {f.number(place.addedKwh)} kWh
                    </span>
                    <span>
                      {place.cost === null
                        ? "No cost"
                        : `${f.cost(place.cost)} · ${f.cost(place.cost / place.addedKwh)}/kWh`}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <PanelNote>No record yet.</PanelNote>
          )}
        </Panel>
      </div>

      <Panel
        title="Frequent routes"
        className="mt-4"
        action={<span className="text-xs text-subtle">3 drives or more</span>}
      >
        {routes.length ? (
          <ol className="divide-y divide-border">
            {routes.map((route) => (
              <li key={route.key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-sm font-medium">
                    {route.from} → {route.to}
                  </span>
                  <span className="shrink-0 text-sm tabular">
                    {route.drives}{" "}
                    <span className="text-muted-foreground">drives</span>
                  </span>
                </div>
                <p className="mt-1.5 truncate text-xs text-muted-foreground tabular">
                  {[
                    f.distance(route.typicalKm),
                    f.duration(route.typicalMin),
                    route.whPerKm === null ? null : f.efficiency(route.whPerKm),
                    `usually at ${f.hour(route.usualHour)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-subtle tabular">
                  <Link
                    href={carPath(car, `/drives/${route.fastestId}`)}
                    transitionTypes={["tab-forward"]}
                    className="underline underline-offset-2 transition-tesla hover:text-foreground"
                  >
                    Fastest {f.duration(route.fastestMin)}
                  </Link>
                  <Link
                    href={carPath(car, `/drives/${route.slowestId}`)}
                    transitionTypes={["tab-forward"]}
                    className="underline underline-offset-2 transition-tesla hover:text-foreground"
                  >
                    Slowest {f.duration(route.slowestMin)}
                  </Link>
                  <span>Last drive {f.dayInline(route.lastAt, now)}</span>
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <PanelNote>No route with 3 drives or more in this period.</PanelNote>
        )}
      </Panel>

      <section className="mt-14">
        <h2 className="text-2xl font-medium">Visited</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The countries, states, and cities where a drive or a charge started or
          ended.
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-x-6">
          <Metric size="lg" label="Countries" value={areas.countries.length} />
          <Metric size="lg" label="States" value={areas.states.length} />
          <Metric size="lg" label="Cities" value={areas.cities.length} />
        </dl>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AreaList title="Top countries" areas={areas.countries} />
          <AreaList title="Top states" areas={areas.states} />
          <AreaList title="Top cities" areas={areas.cities} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-medium">Saved places</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          TeslaMate names a place and sets its charging cost with a geofence.
        </p>
        {geofences.length ? (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {geofences.map((fence) => {
              const visits = visitsByFence.get(fence.id);
              const charges = chargesByFence.get(fence.id);
              return (
                <li key={fence.id} className="rounded-xl bg-card p-5">
                  <p className="truncate font-medium">{fence.name}</p>
                  <p className="mt-1 text-xs text-subtle tabular">
                    {f.number(toElevation(fence.radius, preferences))}{" "}
                    {f.units.elevation} radius
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm tabular">
                    <div>
                      <dt className="text-xs text-muted-foreground">Visits</dt>
                      <dd className="mt-0.5 font-medium">
                        {visits?.visits ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Charged</dt>
                      <dd className="mt-0.5 font-medium">
                        {charges ? `${f.number(charges.addedKwh)} kWh` : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">
                        Cost per kWh
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {fence.costPerUnit === null
                          ? "Not set"
                          : f.cost(fence.costPerUnit)}
                        {fence.sessionFee
                          ? ` + ${f.cost(fence.sessionFee)} per session`
                          : ""}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 rounded-xl bg-card px-6 py-12 text-center text-sm text-subtle">
            No saved places yet.
          </p>
        )}
      </section>
    </PageTransition>
  );
}

function AreaList({ title, areas }: { title: string; areas: VisitedArea[] }) {
  const shown = areas.slice(0, shownAreas);
  const mostPlaces = Math.max(1, ...shown.map((area) => area.places));
  return (
    <Panel title={title}>
      {shown.length ? (
        <ol className="space-y-4">
          {shown.map((area) => (
            <li key={area.key}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-sm font-medium">
                  {area.name}
                </span>
                <span className="shrink-0 text-sm tabular">
                  {area.places}{" "}
                  <span className="text-muted-foreground">
                    {area.places === 1 ? "place" : "places"}
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 ease-tesla starting:w-0!"
                  style={{ width: `${(area.places / mostPlaces) * 100}%` }}
                />
              </div>
              {area.within && (
                <p className="mt-1.5 truncate text-xs text-subtle">
                  {area.within}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <PanelNote>No record yet.</PanelNote>
      )}
    </Panel>
  );
}
