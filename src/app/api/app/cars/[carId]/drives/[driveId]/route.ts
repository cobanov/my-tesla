import { driveDetail } from "@/lib/app/drives";
import { appContext, appJson, appNotFound, parseId } from "@/lib/app/request";
import { findDrive } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/drives/[driveId]">,
) {
  const [context, { driveId }] = await Promise.all([
    appContext(params),
    params,
  ]);
  const id = parseId(driveId);
  const found =
    context && id !== null ? await findDrive(context.car, id) : null;
  if (!context || !found) return appNotFound();
  const { car, f, now, showMaps } = context;
  return appJson(driveDetail(found, car, f, now, showMaps));
}
