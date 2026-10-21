import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { yearPage } from "@/lib/app/year";
import { visitedPlaces } from "@/lib/places-data";
import {
  biggestCharge,
  dataYears,
  driveTotals,
  longestDrives,
  periodChargeTotals,
  statsBuckets,
} from "@/lib/stats-data";
import { pickYear, yearWindow } from "@/lib/year-review";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/year">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, now } = context;
  const years = await dataYears(car.id, f.timeZone);
  const year = pickYear(
    new URL(request.url).searchParams.get("year") ?? undefined,
    years,
    now,
    f.timeZone,
  );
  const window = year === null ? null : yearWindow(year, f.timeZone);
  if (!window) {
    return appJson(
      yearPage(
        {
          years,
          year,
          window,
          drives: {
            drives: 0,
            distanceKm: 0,
            minutes: 0,
            usedKwh: 0,
            speedMaxKmh: null,
            longestKm: null,
          },
          charges: { sessions: 0, addedKwh: 0, cost: null, estimatedCosts: 0 },
          months: [],
          days: [],
          longest: [],
          charge: null,
          visited: [],
        },
        car,
        f,
        now,
      ),
    );
  }
  const { from, to } = window;
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
  return appJson(
    yearPage(
      {
        years,
        year,
        window,
        drives,
        charges,
        months,
        days,
        longest,
        charge,
        visited,
      },
      car,
      f,
      now,
    ),
  );
}
