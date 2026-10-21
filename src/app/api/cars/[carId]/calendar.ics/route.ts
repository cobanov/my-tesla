import { connection } from "next/server";
import { apiUnauthorized, calendarSession } from "@/lib/auth/session";
import {
  calendarFeed,
  calendarName,
  calendarScope,
  chargeEvent,
  driveEvent,
  type CalendarScope,
} from "@/lib/calendar";
import { carPath } from "@/lib/car-slug";
import { isDemoMode } from "@/lib/demo/mode";
import { exportCharges, exportDrives, findCar } from "@/lib/queries";
import { siteLink, siteUrl } from "@/lib/site";
import { asViewer, getFormatter } from "@/lib/viewer";

const yearMs = 366 * 24 * 60 * 60 * 1000;

async function feed(carId: string, scope: CalendarScope): Promise<Response> {
  const car = /^\d{1,5}$/.test(carId) ? await findCar(Number(carId)) : null;
  if (!car) return new Response(null, { status: 404 });
  const now = new Date();
  const range = { start: new Date(now.getTime() - yearMs), end: now };
  const [f, drives, charges] = await Promise.all([
    getFormatter(),
    scope === "charges" ? [] : exportDrives(car, range),
    scope === "drives" ? [] : exportCharges(car.id, range),
  ]);
  const site = siteUrl(process.env);
  const link = (path: string) =>
    site ? siteLink(site, carPath(car, path)) : null;
  const events = [
    ...drives.map((drive) =>
      driveEvent(drive, car.id, f, link(`/drives/${drive.id}`)),
    ),
    ...charges.flatMap((charge) =>
      charge.endAt
        ? [
            chargeEvent(
              { ...charge, endAt: charge.endAt },
              car.id,
              f,
              link(`/charging/${charge.id}`),
            ),
          ]
        : [],
    ),
  ];
  return new Response(
    calendarFeed(calendarName(car.name, scope), events, now),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${car.slug}.ics"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/cars/[carId]/calendar.ics">,
) {
  await connection();
  const { carId } = await context.params;
  const search = new URL(request.url).searchParams;
  const token = search.get("token");
  const scope = calendarScope(search.get("show"));
  if (token !== null && !isDemoMode()) {
    const signedIn = calendarSession(token, Date.now());
    if (!signedIn) {
      return new Response("This calendar link does not work any more.", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return asViewer(signedIn.user.email, () => feed(carId, scope));
  }
  const denied = await apiUnauthorized();
  if (denied) return denied;
  return feed(carId, scope);
}
