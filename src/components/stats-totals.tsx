import { Metric } from "@/components/metric";
import { assessConsumption, ratedWhPerKm } from "@/lib/assessment";
import type { Formatter } from "@/lib/format";
import type { Car } from "@/lib/queries";
import type { ChargeTotals, DriveTotals } from "@/lib/stats-data";
import { statsTotals } from "@/lib/stats-figures";

export function StatsTotals({
  car,
  drives,
  charges,
  f,
}: {
  car: Car;
  drives: DriveTotals;
  charges: ChargeTotals;
  f: Formatter;
}) {
  const { whPerKm, distanceTotal, costPer100 } = statsTotals(
    drives,
    charges.cost,
    f,
  );
  return (
    <>
      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <Metric
          size="lg"
          label="Distance"
          value={f.number(distanceTotal)}
          unit={f.units.distance}
          detail={`${drives.drives} ${drives.drives === 1 ? "drive" : "drives"}`}
        />
        <Metric
          size="lg"
          label="Driving time"
          value={f.duration(drives.minutes)}
        />
        <Metric
          size="lg"
          label="Energy used"
          value={f.number(drives.usedKwh)}
          unit="kWh"
        />
        <Metric
          size="lg"
          label="Efficiency"
          value={f.efficiencyNumber(whPerKm)}
          unit={f.units.efficiency}
          assessment={assessConsumption(
            whPerKm,
            ratedWhPerKm(car),
            f,
            drives.distanceKm,
          )}
        />
      </dl>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <Metric
          label="Charged"
          value={f.number(charges.addedKwh)}
          unit="kWh"
          detail={`${charges.sessions} ${charges.sessions === 1 ? "session" : "sessions"}`}
        />
        <Metric
          label="Charging cost"
          value={f.cost(charges.cost)}
          detail={
            costPer100 === null
              ? undefined
              : `${f.cost(costPer100)} per 100 ${f.units.distance}`
          }
        />
        <Metric
          label="Top speed"
          value={
            drives.speedMaxKmh === null
              ? "—"
              : f.number(f.speedValue(drives.speedMaxKmh) ?? 0)
          }
          unit={f.units.speed}
        />
        <Metric
          label="Longest drive"
          value={
            drives.longestKm === null
              ? "—"
              : f.number(f.distanceValue(drives.longestKm) ?? 0)
          }
          unit={f.units.distance}
        />
      </dl>
    </>
  );
}
