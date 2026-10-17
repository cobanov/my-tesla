import { chargeDetail } from "@/lib/app/charges";
import { appContext, appJson, appNotFound, parseId } from "@/lib/app/request";
import { chargeCurve, findChargeSession } from "@/lib/charge-data";
import { getLive } from "@/lib/live/live";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/charges/[chargeId]">,
) {
  const [context, { chargeId }] = await Promise.all([
    appContext(params),
    params,
  ]);
  const id = parseId(chargeId);
  const session =
    context && id !== null ? await findChargeSession(context.car.id, id) : null;
  if (!context || !session) return appNotFound();
  const { car, f, now, showMaps } = context;
  const inProgress = session.endAt === null && !session.unclosed;
  const [curve, live] = await Promise.all([
    chargeCurve(session.id),
    inProgress ? getLive(car.id) : Promise.resolve(null),
  ]);
  const fullAt =
    live?.connected && live.view.charging.state === "Charging"
      ? live.view.charging.fullAt
      : null;
  return appJson(chargeDetail(session, curve, fullAt, f, now, showMaps));
}
