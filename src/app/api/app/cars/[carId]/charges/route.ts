import { chargeList } from "@/lib/app/charges";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { recentCharges } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/charges">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, now } = context;
  return appJson(chargeList(await recentCharges(car.id), f, now));
}
