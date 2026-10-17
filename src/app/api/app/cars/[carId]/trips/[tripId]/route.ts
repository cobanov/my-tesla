import { tripDetail } from "@/lib/app/drives";
import { appContext, appJson, appNotFound, parseId } from "@/lib/app/request";
import { tripRoutes } from "@/lib/queries";
import { findTrip } from "@/lib/trip-data";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/trips/[tripId]">,
) {
  const [context, { tripId }] = await Promise.all([appContext(params), params]);
  const id = parseId(tripId);
  const trip = context && id !== null ? await findTrip(context.car, id) : null;
  if (!context || !trip) return appNotFound();
  const { car, f, now, showMaps } = context;
  const routes = showMaps
    ? await tripRoutes(
        car.id,
        trip.drives.map((drive) => drive.id),
      )
    : new Map();
  return appJson(tripDetail(trip, routes, car, f, now, showMaps));
}
