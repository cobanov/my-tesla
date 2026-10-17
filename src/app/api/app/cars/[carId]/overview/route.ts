import { overviewPage } from "@/lib/app/overview";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { carImageUrl } from "@/lib/car-image";
import { dayWindow, localDayKey } from "@/lib/insights";
import { getLive } from "@/lib/live/live";
import { carSnapshot, recentCharges, recentDrives } from "@/lib/queries";
import { recentTireLeaks } from "@/lib/stats-data";
import { dayRecords } from "@/lib/timeline-data";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/overview">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, preferences, showMaps, now } = context;
  const show = preferences.overview;
  const window = dayWindow(localDayKey(now, f.timeZone), f.timeZone);
  const [snapshot, [lastDrive], [lastCharge], today, live, leaks] =
    await Promise.all([
      carSnapshot(car.id),
      recentDrives(car, 1),
      recentCharges(car.id, 1),
      show.today
        ? dayRecords(car.id, window.start, window.end)
        : Promise.resolve(null),
      getLive(car.id),
      show.tires ? recentTireLeaks(car.id, f.timeZone) : Promise.resolve([]),
    ]);
  return appJson(
    overviewPage(
      {
        car,
        image: carImageUrl(car),
        snapshot,
        lastDrive: lastDrive ?? null,
        lastCharge: lastCharge ?? null,
        today: today ? { ...today, ...window } : null,
        live,
        leaks,
        show,
        showMaps,
      },
      f,
      now,
    ),
  );
}
