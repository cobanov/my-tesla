import { driveList } from "@/lib/app/drives";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { recentTrips } from "@/lib/trip-data";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/drives">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, now } = context;
  return appJson(driveList(await recentTrips(car), car, f, now));
}
